const SAFE_AGENT_COLUMNS = [
  "id",
  "legacy_convex_id",
  "legacy_creation_time",
  "creator_id",
  "project_id",
  "name",
  "description",
  "price_monthly",
  "status",
  "agent_type",
  "performance",
  "is_active",
  "is_wild",
  "sprite_url",
  "api_endpoint",
  "preview_url",
  "platform",
  "platform_config",
  "created_at",
].join(",");

export interface AgentRow {
  id: string;
  legacy_convex_id: string | null;
  legacy_creation_time: number | null;
  creator_id: string;
  project_id: string | null;
  name: string;
  description: string;
  price_monthly: number | string;
  status: string;
  agent_type: string;
  performance: number | string;
  is_active: boolean;
  is_wild: boolean;
  sprite_url: string | null;
  api_endpoint: string | null;
  preview_url: string | null;
  platform: string | null;
  platform_config: unknown;
  created_at: string;
}

export interface WildAgent {
  _id: string;
  _creationTime: number;
  name: string;
  description: string;
  price: string;
  ownerId: null;
  status: string;
  type: string;
  performance: string;
  isActive: boolean;
  spriteUrl: string | null;
  apiEndpoint: string | null;
  apiKey: null;
  platform: string | null;
  platformConfig: string | null;
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url: url.replace(/\/$/, ""), key };
}

export async function supabaseResponse(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase ${response.status}: ${message}`);
  }
  return response;
}

export async function supabaseJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await supabaseResponse(path, init);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const agentSelect = () => `select=${SAFE_AGENT_COLUMNS}`;

export function toWildAgent(row: AgentRow): WildAgent {
  return {
    _id: row.id,
    _creationTime: row.legacy_creation_time ?? new Date(row.created_at).getTime(),
    name: row.name,
    description: row.description,
    price: String(row.price_monthly ?? 0),
    ownerId: null,
    status: row.status,
    type: row.agent_type,
    performance: String(row.performance ?? 0),
    isActive: row.is_active,
    spriteUrl: row.sprite_url,
    apiEndpoint: row.api_endpoint ?? row.preview_url,
    apiKey: null,
    platform: row.platform,
    // Sandbox/session identifiers stay server-only; the browser only needs the provider.
    platformConfig: row.platform ? JSON.stringify({ provider: row.platform }) : null,
  };
}

export async function syncClerkUser(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Clerk is not configured.");
  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) throw new Error("Could not sync the signed-in user.");
  const user = await response.json();
  const email = user.email_addresses?.find(
    (item: { id: string }) => item.id === user.primary_email_address_id,
  )?.email_address ?? user.email_addresses?.[0]?.email_address;
  if (!email) throw new Error("The signed-in user has no email address.");
  await supabaseResponse("users?on_conflict=clerk_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      clerk_id: userId,
      email,
      full_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
      avatar_url: user.image_url || null,
    }),
  });
}

export async function ownedAgentCount(userId: string): Promise<number> {
  const response = await supabaseResponse(
    `agents?select=id&creator_id=eq.${encodeURIComponent(userId)}&is_wild=eq.false`,
    { headers: { Prefer: "count=exact", Range: "0-0" } },
  );
  const total = response.headers.get("content-range")?.split("/").at(-1);
  return total && total !== "*" ? Number(total) : 0;
}
