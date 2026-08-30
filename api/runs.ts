import { requireUser } from "./_lib/clerk.js";
import { listRunsByOwner, toRunView } from "./_lib/runs.js";

/** GET /api/runs — the caller's own agent runs, newest first. Owner-only. */
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const rows = await listRunsByOwner(user.userId);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ runs: rows.map(toRunView) });
  } catch (error) {
    console.error(`[runs] ${error instanceof Error ? error.message : error}`);
    return res.status(502).json({ error: "Couldn't load your runs." });
  }
}
