import { requireUser } from "../_lib/clerk.js";
import { listGtmAgents } from "../_lib/gtm.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const agents = await listGtmAgents(user.userId);
    return res.status(200).json({ agents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list failed";
    return res.status(502).json({ error: message });
  }
}
