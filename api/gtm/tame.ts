import { z } from "zod";
import { requireUser } from "../_lib/clerk.js";
import { supabaseJson, supabaseResponse } from "../_lib/supabase.js";
import { hasGtm, createGtmSandbox } from "../_lib/gtm.js";

export const config = { maxDuration: 120 };

const requestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  icp: z.object({
    query: z.string().trim().max(500).optional(),
    industry: z.string().trim().max(120).optional(),
    location: z.string().trim().max(120).optional(),
    employee_count: z.string().max(80).optional(),
    roles: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
    search_tools: z.array(z.string()).optional(),
    contact_tools: z.array(z.string()).optional(),
    send_tool: z.string().optional(),
    subject: z.string().trim().max(200).optional(),
    template: z.string().trim().max(2000).optional(),
    limit: z.number().int().min(1).max(25).default(10),
    max_companies_per_cycle: z.number().int().min(1).max(10).default(3),
    contacts_per_company: z.number().int().min(1).max(10).default(2),
    daily_email_cap: z.number().int().min(1).max(100).default(10),
  }).default({}),
  mode: z.enum(["draft", "autosend"]).default("draft"),
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (!hasGtm()) return res.status(503).json({ error: "GTM is not configured (DEEPLINE_API_KEY and DAYTONA_API_KEY)." });

  const parsed = requestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

  try {
    const body = parsed.data;
    const agentRes = await supabaseJson<{ id: string }[]>("agents?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        creator_id: user.userId,
        name: body.name,
        description: body.description || `GTM agent: ${body.icp.query || body.icp.industry || "untitled"}`,
        price_monthly: 0,
        status: "active",
        agent_type: "gtm",
        performance: 0,
        is_active: true,
        is_wild: false,
        platform: "deepline",
        platform_config: {},
        sprite_url: "137",
      }),
    });
    const agentRow = agentRes[0];
    if (!agentRow) throw new Error("Supabase did not create the agent.");

    const gtmRes = await supabaseJson<{ id: string }[]>("gtm_agent_state?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        agent_id: agentRow.id,
        owner_id: user.userId,
        status: "idle",
        mode: body.mode,
        icp: body.icp,
        limits: { daily_email_cap: body.icp.daily_email_cap || 10, lead_notify_threshold: 1 },
        state: { agentId: agentRow.id, cycle: 0, daily_sent: 0, daily_reset_date: "" },
      }),
    });
    const gtmState = gtmRes[0];
    if (!gtmState) throw new Error("Supabase did not create the GTM state.");

    const row = await createGtmSandbox({
      id: gtmState.id,
      agent_id: agentRow.id,
      owner_id: user.userId,
      status: "idle",
      mode: body.mode,
      icp: body.icp,
      limits: { daily_email_cap: body.icp.daily_email_cap || 10, lead_notify_threshold: 1 },
      state: { agentId: agentRow.id, cycle: 0, daily_sent: 0, daily_reset_date: "" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({ agent: { id: agentRow.id, name: body.name }, gtm: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to tame GTM agent";
    console.error(`[gtm/tame] ${message}`);
    return res.status(502).json({ error: message });
  }
}
