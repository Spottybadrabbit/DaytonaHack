import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const source = process.argv[2];
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clerkKey = process.env.CLERK_SECRET_KEY;

if (!source) throw new Error("Usage: node scripts/migrate-convex-export.mjs <snapshot.zip|export-directory>");
if (!supabaseUrl || !serviceKey || !clerkKey) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CLERK_SECRET_KEY are required.");
}

function documents(table) {
  const path = `${table}/documents.jsonl`;
  const text = statSync(source).isDirectory()
    ? readFileSync(join(source, path), "utf8")
    : execFileSync("unzip", ["-p", source, path], { encoding: "utf8" });
  return text.trim() ? text.trim().split("\n").map((line) => JSON.parse(line)) : [];
}

async function request(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const clerkId = (ownerId) => ownerId?.split("|").at(-1) || null;

async function clerkUser(userId) {
  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${clerkKey}` },
  });
  if (!response.ok) throw new Error(`Clerk ${response.status}: could not resolve a migrated owner.`);
  const user = await response.json();
  const email = user.email_addresses?.find((item) => item.id === user.primary_email_address_id)?.email_address
    ?? user.email_addresses?.[0]?.email_address;
  if (!email) throw new Error("A migrated Clerk owner has no email address.");
  return {
    clerk_id: userId,
    email,
    full_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
    avatar_url: user.image_url || null,
  };
}

async function upsertUser(user) {
  await request("users?on_conflict=clerk_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(user),
  });
}

const agents = documents("agents");
const usage = documents("usage");
const ownerIds = [...new Set([
  ...agents.map((agent) => clerkId(agent.ownerId)),
  ...usage.map((entry) => clerkId(entry.userId)),
].filter(Boolean))];

await upsertUser({
  clerk_id: "system:agents-in-the-wild",
  email: "system@agentsinthewild.invalid",
  full_name: "Agents in the Wild",
});
for (const ownerId of ownerIds) await upsertUser(await clerkUser(ownerId));

const category = (type) =>
  type === "Social Media" || type === "Professional Networking" ? "social" : "ai-tools";
const jsonConfig = (value) => {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return { raw: value }; }
};

const agentRows = agents.map((agent) => ({
  legacy_convex_id: agent._id,
  legacy_owner_id: agent.ownerId ?? null,
  legacy_creation_time: agent._creationTime,
  creator_id: clerkId(agent.ownerId) ?? "system:agents-in-the-wild",
  name: agent.name,
  description: agent.description,
  category: category(agent.type),
  price_monthly: Number(agent.price) || 0,
  is_published: true,
  preview_url: agent.apiEndpoint ?? null,
  agent_type: agent.type,
  status: agent.status,
  performance: Number(agent.performance) || 0,
  is_active: Boolean(agent.isActive),
  is_wild: agent.ownerId == null,
  sprite_url: agent.spriteUrl ?? null,
  api_endpoint: agent.apiEndpoint ?? null,
  api_key: agent.apiKey ?? null,
  platform: agent.platform ?? null,
  platform_config: jsonConfig(agent.platformConfig),
  created_at: new Date(agent._creationTime).toISOString(),
  updated_at: new Date(agent._creationTime).toISOString(),
}));

if (agentRows.length) {
  await request("agents?on_conflict=legacy_convex_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(agentRows),
  });
}

const usageRows = usage.map((entry) => ({
  legacy_convex_id: entry._id,
  user_id: clerkId(entry.userId),
  action_type: "credit_consumed",
  credits_consumed: Number(entry.tasksUsed) || 0,
  metadata: { source: "convex", month: entry.month },
  created_at: new Date(entry._creationTime).toISOString(),
}));
if (usageRows.some((entry) => !entry.user_id)) throw new Error("A usage row has no Clerk owner.");
if (usageRows.length) {
  await request("usage_analytics?on_conflict=legacy_convex_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(usageRows),
  });
}

const migratedAgents = await request("agents?select=legacy_convex_id&legacy_convex_id=not.is.null");
const migratedUsage = await request("usage_analytics?select=legacy_convex_id&legacy_convex_id=not.is.null");
const expectedAgentIds = new Set(agents.map((agent) => agent._id));
const expectedUsageIds = new Set(usage.map((entry) => entry._id));
const missingAgents = [...expectedAgentIds].filter(
  (id) => !migratedAgents.some((row) => row.legacy_convex_id === id),
);
const missingUsage = [...expectedUsageIds].filter(
  (id) => !migratedUsage.some((row) => row.legacy_convex_id === id),
);
if (missingAgents.length || missingUsage.length) throw new Error("Migration reconciliation failed.");

console.log(JSON.stringify({
  agents: { source: agents.length, migrated: migratedAgents.length, missing: missingAgents.length },
  usage: { source: usage.length, migrated: migratedUsage.length, missing: missingUsage.length },
}, null, 2));
