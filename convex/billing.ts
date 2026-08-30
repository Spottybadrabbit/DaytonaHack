import { query } from "./_generated/server";
import { tierForIdentity } from "./plans";

/**
 * Everything the account page needs about the signed-in user, sourced from
 * the Convex side of the fence:
 *   - `authed`: whether ctx.auth.getUserIdentity() is non-null. This is the
 *     honest bridge-health signal — Clerk-signed-in but authed:false means the
 *     Clerk→Convex token handshake is broken, which a plain "Free, 0 credits"
 *     page would otherwise hide.
 *   - live usage: agents owned + credits used this month.
 *   - the tier Convex is actually ENFORCING (from the token's pla/plan claim),
 *     so the page can flag any drift from the plan Clerk shows client-side.
 */
export const mySnapshot = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { authed: false as const };
    }

    const month = new Date().toISOString().slice(0, 7);
    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user_and_month", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("month", month),
      )
      .unique();

    // Bounded pack count — read at most 101 to show "100+" without a full scan.
    const owned = await ctx.db
      .query("agents")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.tokenIdentifier))
      .take(101);

    const tier = tierForIdentity(identity);

    return {
      authed: true as const,
      subject: identity.subject,
      email: identity.email ?? null,
      month,
      agentsOwned: owned.length,
      creditsUsed: usage?.tasksUsed ?? 0,
      // The tier the backend is enforcing (may lag Clerk's display until the
      // pla claim propagates via the dashboard Convex integration).
      enforcedTier: tier.key,
      limits: tier.limits,
    };
  },
});
