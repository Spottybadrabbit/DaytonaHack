import { listActiveGtmAgents, resumeGtmCycle, collectApprovedOutreach, pollAndIngest } from "../_lib/gtm.js";

export const config = { maxDuration: 300 };

export default async function handler(req: any, res: any) {
  const secret = process.env.GTM_TICK_SECRET;
  const provided = req.headers["x-gtm-tick-secret"] || req.query?.secret;
  if (secret && provided !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const results: Array<{ agent: string; status: string; sandbox?: string }> = [];
  try {
    const agents = await listActiveGtmAgents();
    for (const agent of agents) {
      try {
        if (agent.status === "hunting") {
          const updated = await pollAndIngest(agent);
          if (updated.status === "idle" || updated.status === "error") {
            // Trigger next cycle if idle and not paused.
            if (updated.status === "idle") {
              const approved = await collectApprovedOutreach(agent.agent_id, agent.owner_id);
              await resumeGtmCycle({ ...updated, state: { ...updated.state, agentId: agent.agent_id } }, approved);
            }
          }
          results.push({ agent: agent.agent_id, status: updated.status });
          continue;
        }

        if (agent.status === "idle") {
          const approved = await collectApprovedOutreach(agent.agent_id, agent.owner_id);
          const launch = await resumeGtmCycle({ ...agent, state: { ...agent.state, agentId: agent.agent_id } }, approved);
          results.push({ agent: agent.agent_id, status: "hunting", sandbox: launch.sandboxId });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        results.push({ agent: agent.agent_id, status: `error: ${message}` });
      }
    }
    return res.status(200).json({ processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "tick failed";
    return res.status(502).json({ error: message });
  }
}
