import { useAuth } from "@clerk/react";
import { TIERS, TIER_ORDER, type Tier } from "@shared/tiers";

/**
 * Client-side view of the shared tier config (@shared/tiers.ts — the same
 * file the Vercel API enforces from). Clerk is the source of truth for WHO is on
 * WHICH plan; these hooks read that via has({ plan }) for UI gating only.
 * Authoritative enforcement lives in the server-side Supabase API.
 */

export const PLANS = {
  FREE_USER: TIERS.explorer.slugUser!,
  STANDARD_USER: TIERS.builder.slugUser!,
  FREE_ORG: TIERS.explorer.slugOrg!,
  STANDARD_ORG: TIERS.builder.slugOrg!,
} as const;

/** Clerk plan ids (cplan_…) for the custom checkout deep-link. */
export const PLAN_IDS = {
  STANDARD_USER: TIERS.builder.planId!,
} as const;

/**
 * Resolve the signed-in user's active tier from Clerk's plan claims.
 * Walks tiers high→low and returns the first the user has; defaults to
 * Explorer. `isLoaded` gates rendering until Clerk has resolved auth.
 */
export function useCurrentTier(): { isLoaded: boolean; tier: Tier; isPaid: boolean } {
  const { has, isLoaded } = useAuth();

  let tier: Tier = TIERS.explorer;
  if (isLoaded && has) {
    for (const key of [...TIER_ORDER].reverse()) {
      const t = TIERS[key];
      const hit =
        (t.slugUser && has({ plan: t.slugUser })) ||
        (t.slugOrg && has({ plan: t.slugOrg }));
      if (hit) {
        tier = t;
        break;
      }
    }
  }

  return { isLoaded, tier, isPaid: tier.key !== "explorer" };
}
