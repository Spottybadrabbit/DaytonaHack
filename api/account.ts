import { tierFromClaims } from "../shared/tiers.js";
import { requireUser } from "./_lib/clerk.js";
import { ownedAgentCount, supabaseJson, syncClerkUser } from "./_lib/supabase.js";

interface UserRow {
  credits_used: number;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  await syncClerkUser(user.userId);
  const rows = await supabaseJson<UserRow[]>(
    `users?select=credits_used&clerk_id=eq.${encodeURIComponent(user.userId)}&limit=1`,
  );
  return res.status(200).json({
    authed: true,
    agentsOwned: await ownedAgentCount(user.userId),
    creditsUsed: rows[0]?.credits_used ?? 0,
    enforcedTier: tierFromClaims(user.claims).key,
  });
}
