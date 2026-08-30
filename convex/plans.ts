import { tierFromClaims, isUnlimited, type Tier, type TierLimits } from "../shared/tiers.js";

/**
 * Server-side plan resolution — the authoritative side of the shared tier
 * config (../shared/tiers.ts, the same file the client reads). Limits here
 * are what mutations actually enforce.
 *
 * The tier comes from the Clerk session token, read in this precedence:
 *   1. `pla` claim — native to Clerk's default v2 session token (present when
 *      the dashboard Convex integration is active; carries the REAL billing
 *      plan, e.g. "u:standard_plan"). This is the robust path.
 *   2. `plan` claim — the custom "convex" JWT template's
 *      {{user.public_metadata.plan}} fallback.
 * Anything unrecognised falls back to Explorer (free) — never fail open.
 */
export type { TierLimits };

export function tierForIdentity(identity: object): Tier {
  return tierFromClaims(identity as { pla?: unknown; plan?: unknown });
}

export function limitsForIdentity(identity: object): TierLimits {
  return tierForIdentity(identity).limits;
}

export { isUnlimited };
