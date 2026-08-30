import { z } from "zod";
import { tierFromClaims } from "../shared/tiers.js";
import { requireUser } from "./_lib/clerk.js";
import {
  agentSelect,
  ownedAgentCount,
  supabaseJson,
  syncClerkUser,
  toWildAgent,
  type AgentRow,
} from "./_lib/supabase.js";

const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(6_000),
  price: z.union([z.string(), z.number()]).transform((value) => Number(value) || 0),
  type: z.string().trim().min(1).max(100),
  spriteUrl: z.string().max(20).nullable().optional(),
  platform: z.string().trim().max(100).nullable().optional(),
  platformConfig: z.string().max(4_096).nullable().optional(),
});

const categoryFor = (type: string) =>
  type === "Social Media" || type === "Professional Networking" ? "social" : "ai-tools";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    let filter = "";
    if (req.query?.mine === "1") {
      const user = await requireUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      filter = `&creator_id=eq.${encodeURIComponent(user.userId)}&is_wild=eq.false`;
    }
    const rows = await supabaseJson<AgentRow[]>(
      `agents?${agentSelect()}${filter}&order=created_at.desc&limit=100`,
    );
    return res.status(200).json(rows.map(toWildAgent));
  }

  if (req.method === "POST") {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const parsed = createAgentSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

    await syncClerkUser(user.userId);
    const tier = tierFromClaims(user.claims);
    if (await ownedAgentCount(user.userId) >= tier.limits.concurrentAgents) {
      return res.status(409).json({
        error: `Your pack is full (${tier.limits.concurrentAgents} agents on your plan).`,
      });
    }

    let platformConfig: unknown = {};
    if (parsed.data.platformConfig) {
      try {
        platformConfig = JSON.parse(parsed.data.platformConfig);
      } catch {
        return res.status(400).json({ error: "Platform configuration must be valid JSON." });
      }
    }
    const rows = await supabaseJson<AgentRow[]>(`agents?${agentSelect()}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        creator_id: user.userId,
        name: parsed.data.name,
        description: parsed.data.description,
        category: categoryFor(parsed.data.type),
        price_monthly: parsed.data.price,
        is_published: true,
        agent_type: parsed.data.type,
        status: "idle",
        performance: 0,
        is_active: false,
        is_wild: false,
        sprite_url: parsed.data.spriteUrl ?? "137",
        platform: parsed.data.platform ?? null,
        platform_config: platformConfig,
      }),
    });
    return res.status(201).json(toWildAgent(rows[0]));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
