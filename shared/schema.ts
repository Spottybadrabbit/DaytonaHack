import { pgTable, text, serial, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price").notNull(),
  ownerId: integer("owner_id"),
  status: text("status").notNull().default("idle"),
  type: text("type").notNull(),
  performance: decimal("performance").notNull().default("0"),
  isActive: boolean("is_active").notNull().default(false),
  spriteUrl: text("sprite_url").notNull().default("137"),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  platform: text("platform"),
  platformConfig: text("platform_config"),
});

const socialPlatforms = ["instagram", "linkedin", "facebook", "tiktok", "twitter"] as const;

const resultTypes = ["posts", "comments", "stories"] as const;
const searchTypes = ["user", "hashtag", "place"] as const;

const instagramConfigSchema = z.object({
  addParentData: z.boolean(),
  directUrls: z.array(z.string().url()),
  enhanceUserSearchWithFacebookPage: z.boolean(),
  isUserReelFeedURL: z.boolean(),
  isUserTaggedFeedURL: z.boolean(),
  resultsLimit: z.number(),
  resultsType: z.enum(resultTypes),
  searchLimit: z.number(),
  searchType: z.enum(searchTypes),
  search: z.string().optional(),
  proxy: z.object({
    useApifyProxy: z.boolean(),
    apifyProxyGroups: z.array(z.string()),
  }),
});

export const insertAgentSchema = createInsertSchema(agents)
  .pick({
    name: true,
    description: true,
    price: true,
    type: true,
  })
  .extend({
    platform: z.enum(["instagram", "linkedin", "facebook", "tiktok", "twitter"]).transform(val => val.toLowerCase()),
    platformConfig: z.string().optional(),
  });

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InstagramConfig = z.infer<typeof instagramConfigSchema>;