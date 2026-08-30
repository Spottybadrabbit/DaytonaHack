import { query, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { UserIdentity } from "convex/server";
import { v } from "convex/values";
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { limitsForIdentity } from "./plans";
import { isUnlimited, type TierLimits } from "../shared/tiers.js";

/**
 * Agents API. Every mutation is a serializable ACID transaction: the rate
 * limit, quota check, and document write commit atomically — concurrent
 * requests cannot both slip under a limit.
 *
 * Reads are public (the marketplace is a public surface); writes require a
 * Clerk-verified identity. Throttling uses the official rate-limiter
 * component (token buckets, no lost-update races) keyed by the identity's
 * tokenIdentifier, with a bucket per plan tier — EVERY tier is limited.
 */

// One bucket per tier's per-minute ceiling (see shared/tiers.ts). EVERY tier
// is throttled so nobody — free or paid — can run up an uncontrolled bill.
const rateLimiter = new RateLimiter(components.rateLimiter, {
  api30: { kind: "token bucket", rate: 30, period: MINUTE },
  api300: { kind: "token bucket", rate: 300, period: MINUTE },
  api600: { kind: "token bucket", rate: 600, period: MINUTE },
  api1200: { kind: "token bucket", rate: 1200, period: MINUTE },
});

const LIST_LIMIT = 100;

async function requireIdentity(ctx: QueryCtx | MutationCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Sign in to do that — the wilds are open to browse, not to command.");
  }
  return identity;
}

async function enforceRateLimit(
  ctx: MutationCtx,
  identity: UserIdentity,
  limits: TierLimits,
): Promise<void> {
  const rpm = limits.apiRequestsPerMinute;
  const bucket = rpm >= 1200 ? "api1200" : rpm >= 600 ? "api600" : rpm >= 300 ? "api300" : "api30";
  await rateLimiter.limit(ctx, bucket, { key: identity.tokenIdentifier, throws: true });
}

/** Latest agents (bounded). Subscribed clients update in real time. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").order("desc").take(LIST_LIMIT);
  },
});

/** One agent by id (null if the trail is cold). */
export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/** The signed-in user's tamed agents (bounded by the largest plan cap). */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("agents")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.tokenIdentifier))
      .take(LIST_LIMIT);
  },
});

/** Create (raise) an agent — enforces the plan's concurrent-agent cap. */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.string(),
    type: v.string(),
    spriteUrl: v.union(v.string(), v.null()),
    platform: v.union(v.string(), v.null()),
    platformConfig: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const limits = limitsForIdentity(identity);
    await enforceRateLimit(ctx, identity, limits);

    // Bounded existence check: we only need to know whether the cap is hit,
    // so read at most cap documents — never an unbounded collect-and-count.
    // Unlimited tiers skip the check (and the potentially huge .take).
    if (!isUnlimited(limits.concurrentAgents)) {
      const owned = await ctx.db
        .query("agents")
        .withIndex("by_owner", (q) => q.eq("ownerId", identity.tokenIdentifier))
        .take(limits.concurrentAgents);
      if (owned.length >= limits.concurrentAgents) {
        throw new Error(
          `Your pack is full (${limits.concurrentAgents} agents on your plan). Upgrade to raise more.`,
        );
      }
    }

    return await ctx.db.insert("agents", {
      ...args,
      ownerId: identity.tokenIdentifier,
      status: "idle",
      performance: "0",
      isActive: false,
      apiEndpoint: null,
      apiKey: null,
    });
  },
});

/**
 * Activate/deactivate or otherwise set status.
 * Commanding a WILD (unowned) creature tames it first — it joins your pack,
 * subject to the plan's concurrent-agent cap. Owned creatures obey only
 * their tamer.
 */
export const setStatus = mutation({
  args: { id: v.id("agents"), status: v.string(), isActive: v.boolean() },
  handler: async (ctx, { id, status, isActive }) => {
    const identity = await requireIdentity(ctx);
    const limits = limitsForIdentity(identity);
    await enforceRateLimit(ctx, identity, limits);

    const agent = await ctx.db.get(id);
    if (!agent) throw new Error("That creature is nowhere to be found.");

    if (agent.ownerId === null) {
      if (!isUnlimited(limits.concurrentAgents)) {
        const owned = await ctx.db
          .query("agents")
          .withIndex("by_owner", (q) => q.eq("ownerId", identity.tokenIdentifier))
          .take(limits.concurrentAgents);
        if (owned.length >= limits.concurrentAgents) {
          throw new Error(
            `Your pack is full (${limits.concurrentAgents} agents on your plan). Upgrade to tame more.`,
          );
        }
      }
      await ctx.db.patch(id, { ownerId: identity.tokenIdentifier, status, isActive });
    } else {
      if (agent.ownerId !== identity.tokenIdentifier) {
        throw new Error("You can only command creatures you have tamed.");
      }
      await ctx.db.patch(id, { status, isActive });
    }
    return await ctx.db.get(id);
  },
});

/** Record a completed task run against the monthly quota — owner only. */
export const recordTask = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, { id }) => {
    const identity = await requireIdentity(ctx);
    const limits = limitsForIdentity(identity);
    await enforceRateLimit(ctx, identity, limits);

    const agent = await ctx.db.get(id);
    if (!agent || agent.ownerId !== identity.tokenIdentifier) {
      throw new Error("You can only command creatures you have tamed.");
    }

    const month = new Date().toISOString().slice(0, 7);
    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user_and_month", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("month", month),
      )
      .unique();
    const used = usage?.tasksUsed ?? 0;
    if (!isUnlimited(limits.creditsPerMonth) && used >= limits.creditsPerMonth) {
      throw new Error(
        `Monthly credit quota reached (${limits.creditsPerMonth.toLocaleString()} on your plan). Resets next month, or upgrade for more.`,
      );
    }
    if (usage) {
      await ctx.db.patch(usage._id, { tasksUsed: used + 1 });
    } else {
      await ctx.db.insert("usage", {
        userId: identity.tokenIdentifier,
        month,
        tasksUsed: 1,
      });
    }
    return { creditsUsed: used + 1, creditsPerMonth: limits.creditsPerMonth };
  },
});
