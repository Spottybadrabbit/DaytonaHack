import { z } from "zod";
import { requireUser } from "../_lib/clerk.js";
import { approveOutreach } from "../_lib/gtm.js";

const requestSchema = z.object({
  outreach_id: z.string().uuid(),
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = requestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

  try {
    await approveOutreach(parsed.data.outreach_id, user.userId);
    return res.status(200).json({ approved: parsed.data.outreach_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
    return res.status(502).json({ error: message });
  }
}
