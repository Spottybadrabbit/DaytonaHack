import { requireUser } from "../_lib/clerk.js";
import {
  findOwnedGtmAgentByAgentId,
  listGtmLeads,
  listGtmOutreach,
  listGtmActivity,
  resumeGtmCycle,
  collectApprovedOutreach,
  pollAndIngest,
} from "../_lib/gtm.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const config = { maxDuration: 120 };

export default async function handler(req: any, res: any) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = String(rawId ?? "");
  if (!UUID.test(id)) return res.status(404).json({ error: "Not found" });

  const agent = await findOwnedGtmAgentByAgentId(id, user.userId);
  if (!agent) return res.status(404).json({ error: "Not found" });

  try {
    if (req.method === "GET") {
      const [leads, outreach, activity] = await Promise.all([
        listGtmLeads(id, user.userId, 20),
        listGtmOutreach(id, user.userId),
        listGtmActivity(id, user.userId, 50),
      ]);
      return res.status(200).json({ agent, leads, outreach, activity });
    }

    if (req.method === "POST") {
      const action = req.body?.action;
      if (action === "hunt") {
        if (agent.status === "hunting") return res.status(409).json({ error: "Already hunting." });
        const approved = await collectApprovedOutreach(id, user.userId);
        const launch = await resumeGtmCycle({ ...agent, state: { ...agent.state, agentId: agent.agent_id } }, approved);
        return res.status(200).json({ started: true, agent: { ...agent, status: "hunting", ...launch } });
      }
      if (action === "poll") {
        const updated = await pollAndIngest(agent);
        return res.status(200).json({ agent: updated });
      }
      return res.status(400).json({ error: "Unknown action" });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GTM request failed";
    console.error(`[gtm/${id}] ${message}`);
    return res.status(502).json({ error: message });
  }
}
