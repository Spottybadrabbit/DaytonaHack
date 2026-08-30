import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex schema for Agents in the Wild.
 *
 * `agents` mirrors the shape the UI already consumes (shared/seed-data.ts)
 * so the frontend swap from the static /api/agents is mechanical. `ownerId`
 * holds the Clerk identity's tokenIdentifier (never the bare subject — see
 * convex/_generated/ai/guidelines.md).
 *
 * `usage` is the monthly task-quota counter (tasksPerMonth in convex/plans.ts),
 * one row per user per calendar month. Per-minute request throttling is NOT
 * here — that's handled by the @convex-dev/rate-limiter component, which owns
 * its own isolated tables.
 */
export default defineSchema({
  agents: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.string(),
    ownerId: v.union(v.string(), v.null()),
    status: v.string(),
    type: v.string(),
    performance: v.string(),
    isActive: v.boolean(),
    spriteUrl: v.union(v.string(), v.null()),
    apiEndpoint: v.union(v.string(), v.null()),
    apiKey: v.union(v.string(), v.null()),
    platform: v.union(v.string(), v.null()),
    platformConfig: v.union(v.string(), v.null()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  usage: defineTable({
    userId: v.string(),
    // "YYYY-MM" — monthly task quota bucket
    month: v.string(),
    tasksUsed: v.number(),
  }).index("by_user_and_month", ["userId", "month"]),
});
