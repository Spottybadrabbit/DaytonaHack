/**
 * THE single source of truth for subscription tiers — imported by the client
 * (lib/plans.ts, pricing, account page) AND Convex (plans.ts enforcement).
 * Change a number here and it changes everywhere. No runtime deps so it
 * bundles cleanly into both a browser build and a Convex function.
 *
 * Clerk plan slugs (dev instance gorgeous-shrimp-61):
 *   Explorer → free_user / free_org
 *   Builder  → standard_plan (user) / standard (org)   $60/mo, $50/mo annual
 *   Ranger   → not yet created in Clerk (dashboard-only; POST /commerce/plans is 405)
 *   Scale    → contact sales, no self-serve plan
 */

/** Sentinel for "unlimited" — finite so Convex .take() stays safe. */
export const UNLIMITED = 1_000_000;

export type TierKey = "explorer" | "builder" | "ranger" | "scale";

export interface TierLimits {
  /** Agents allowed in a pack at once. */
  concurrentAgents: number;
  /** Task credits per calendar month (the metered "credits" unit). */
  creditsPerMonth: number;
  /** Per-user request ceiling — every tier is throttled. */
  apiRequestsPerMinute: number;
}

export interface Tier {
  key: TierKey;
  name: string;
  blurb: string;
  /** null price = custom / contact sales. */
  price: { monthly: number | null; annual: number | null };
  /** Clerk plan slugs, if the tier has a self-serve plan. */
  slugUser?: string;
  slugOrg?: string;
  /** Clerk plan id (cplan_…) for the custom checkout deep-link. */
  planId?: string;
  limits: TierLimits;
  features: string[];
  cta: { label: string; kind: "signup" | "checkout" | "contact" };
  highlight?: boolean;
}

export const TIERS: Record<TierKey, Tier> = {
  explorer: {
    key: "explorer",
    name: "Explorer",
    blurb: "For wandering the wilds and taming your first few.",
    price: { monthly: 0, annual: 0 },
    slugUser: "free_user",
    slugOrg: "free_org",
    limits: { concurrentAgents: 3, creditsPerMonth: 50, apiRequestsPerMinute: 30 },
    features: [
      "3 agents in your pack",
      "50 task credits / month",
      "Community support",
      "Basic logging",
      "Public integrations",
    ],
    cta: { label: "Start free", kind: "signup" },
  },
  builder: {
    key: "builder",
    name: "Builder",
    blurb: "For keepers running a working pack.",
    price: { monthly: 60, annual: 50 },
    slugUser: "standard_plan",
    slugOrg: "standard",
    planId: "cplan_34kEUdvufZKLrD2jbALqxP815pf",
    limits: { concurrentAgents: 25, creditsPerMonth: 1_000, apiRequestsPerMinute: 300 },
    features: [
      "25 agents in your pack",
      "1,000 task credits / month",
      "Priority support",
      "Private integrations",
      "Full audit trails",
      "Team workspaces",
      "Custom agent roles",
    ],
    cta: { label: "Start trial", kind: "checkout" },
    highlight: true,
  },
  ranger: {
    key: "ranger",
    name: "Ranger",
    blurb: "For outfitters running the wilds at depth.",
    price: { monthly: 150, annual: 125 },
    // No Clerk plan yet — create in the dashboard, then add slug + planId here.
    limits: { concurrentAgents: 100, creditsPerMonth: 10_000, apiRequestsPerMinute: 600 },
    features: [
      "100 agents in your pack",
      "10,000 task credits / month",
      "Everything in Builder",
      "Dedicated throughput",
      "Advanced analytics",
      "Early access to new species",
    ],
    cta: { label: "Request access", kind: "contact" },
  },
  scale: {
    key: "scale",
    name: "Scale",
    blurb: "For agent-first organizations.",
    price: { monthly: null, annual: null },
    limits: {
      concurrentAgents: UNLIMITED,
      creditsPerMonth: UNLIMITED,
      apiRequestsPerMinute: 1_200,
    },
    features: [
      "Unlimited agents",
      "Unlimited credits",
      "24/7 dedicated support",
      "On-premise deployment",
      "SLA guarantee",
      "Custom LLM routing",
    ],
    cta: { label: "Contact sales", kind: "contact" },
  },
};

export const TIER_ORDER: TierKey[] = ["explorer", "builder", "ranger", "scale"];

/** Map a Clerk plan slug to its tier. Unknown / free / absent → explorer. */
export function tierFromSlug(slug: string | null | undefined): Tier {
  if (!slug) return TIERS.explorer;
  for (const key of TIER_ORDER) {
    const t = TIERS[key];
    if (t.slugUser === slug || t.slugOrg === slug) return t;
  }
  return TIERS.explorer;
}

/**
 * Resolve the active tier from a Clerk session token's `pla` claim.
 * `pla` is a comma-separated list of `scope:slug` (e.g. "u:standard_plan").
 * We also accept a bare `plan` slug (the custom "convex" JWT template path).
 * Highest-ranked matching tier wins; nothing → explorer.
 */
export function tierFromClaims(claims: {
  pla?: unknown;
  plan?: unknown;
}): Tier {
  const slugs = new Set<string>();
  if (typeof claims.pla === "string") {
    for (const entry of claims.pla.split(",")) {
      const slug = entry.includes(":") ? entry.split(":")[1] : entry;
      if (slug) slugs.add(slug.trim());
    }
  }
  if (typeof claims.plan === "string" && claims.plan) slugs.add(claims.plan.trim());

  let best: Tier = TIERS.explorer;
  for (const key of TIER_ORDER) {
    const t = TIERS[key];
    if ((t.slugUser && slugs.has(t.slugUser)) || (t.slugOrg && slugs.has(t.slugOrg))) {
      best = t; // TIER_ORDER ascends, so the last match is the highest tier
    }
  }
  return best;
}

export const isUnlimited = (n: number) => n >= UNLIMITED;
