import { z } from "zod";
import { tierFromClaims } from "../../shared/tiers.js";
import { requireUser } from "../_lib/clerk.js";
import {
  agentSelect,
  ownedAgentCount,
  supabaseJson,
  syncClerkUser,
  toWildAgent,
  type AgentRow,
} from "../_lib/supabase.js";

const statusSchema = z.object({
  status: z.string().regex(/^(idle|running|building|published|error|suspended|task:[A-Za-z0-9_-]+)$/),
  isActive: z.boolean(),
});

export default async function handler(req: any, res: any) {
  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = String(rawId ?? "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const filter = uuid ? `id=eq.${id}` : `legacy_convex_id=eq.${encodeURIComponent(id)}`;
  const found = (await supabaseJson<AgentRow[]>(`agents?${agentSelect()}&${filter}&limit=1`))[0];

  if (req.method === "GET") {
    if (!found) return res.status(404).json({ error: "Agent not found" });
    return res.status(200).json(toWildAgent(found));
  }

  if (req.method === "PATCH") {
    if (!found) return res.status(404).json({ error: "Agent not found" });
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const parsed = statusSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid agent status." });

    if (!found.is_wild && found.creator_id !== user.userId) {
      return res.status(403).json({ error: "You can only command creatures you have tamed." });
    }
    if (found.is_wild) {
      const tier = tierFromClaims(user.claims);
      if (await ownedAgentCount(user.userId) >= tier.limits.concurrentAgents) {
        return res.status(409).json({ error: `Your pack is full (${tier.limits.concurrentAgents} agents).` });
      }
      await syncClerkUser(user.userId);
    }

    const rows = await supabaseJson<AgentRow[]>(`agents?${agentSelect()}&id=eq.${found.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        creator_id: found.is_wild ? user.userId : found.creator_id,
        is_wild: false,
        status: parsed.data.status,
        is_active: parsed.data.isActive,
      }),
    });
    return res.status(200).json(toWildAgent(rows[0]));
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
