import { internalMutation } from "./_generated/server";
import { seedAgents } from "../shared/seed-data.js";

/**
 * One-time seed: copies the six demo creatures from shared/seed-data into
 * Convex so the app has live documents to subscribe to. Idempotent — skips
 * if the table already has agents. Run from the dashboard or:
 *   npx convex run seed:seedAgentsTable
 */
export const seedAgentsTable = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("agents").take(1);
    if (existing.length > 0) {
      return { seeded: 0, note: "agents table already populated — skipped" };
    }
    for (const a of seedAgents) {
      await ctx.db.insert("agents", {
        name: a.name,
        description: a.description,
        price: a.price,
        // Seed creatures are wild (unowned); the legacy type was number|null.
        ownerId: null,
        status: a.status,
        type: a.type,
        performance: a.performance,
        isActive: a.isActive,
        spriteUrl: a.spriteUrl,
        apiEndpoint: a.apiEndpoint,
        apiKey: a.apiKey,
        platform: a.platform,
        platformConfig: a.platformConfig,
      });
    }
    return { seeded: seedAgents.length };
  },
});
