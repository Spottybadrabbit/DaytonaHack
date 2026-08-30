import { z } from "zod";

// Schema definitions
const instagramScraperConfigSchema = z.object({
  addParentData: z.boolean().default(false),
  directUrls: z.array(z.string()).default([]),
  enhanceUserSearchWithFacebookPage: z.boolean().default(false),
  isUserReelFeedURL: z.boolean().default(false),
  isUserTaggedFeedURL: z.boolean().default(false),
  resultsLimit: z.number().default(100),
  resultsType: z.enum(["posts", "comments", "stories"]).default("posts"),
  searchLimit: z.number().default(1),
  searchType: z.enum(["user", "hashtag", "place"]).default("hashtag"),
  proxy: z.object({
    useApifyProxy: z.boolean().default(true),
    apifyProxyGroups: z.array(z.string()).default(["RESIDENTIAL"]),
  }).optional(),
});

export type InstagramScraperConfig = z.infer<typeof instagramScraperConfigSchema>;

// Helper function for API requests
const makeApifyRequest = async (endpoint: string, options: RequestInit = {}) => {
  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) {
    throw new Error("Apify API key is not configured");
  }

  const url = `https://api.apify.com/v2/${endpoint}?token=${APIFY_API_KEY}`;
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API request failed: ${await response.text()}`);
  }

  return response.json();
};

// API functions
export const getRunDetails = (runId: string) => 
  makeApifyRequest(`actor-runs/${runId}`);

export const getRunOutput = (storeId: string) => 
  makeApifyRequest(`key-value-stores/${storeId}/records/OUTPUT`);

export const getDatasetItems = (datasetId: string) => 
  makeApifyRequest(`datasets/${datasetId}/items`);

export const abortRun = (runId: string) => 
  makeApifyRequest(`actor-runs/${runId}/abort`, { method: "POST" });

export const resurrectRun = (runId: string) => 
  makeApifyRequest(`actor-runs/${runId}/resurrect`, { method: "POST" });

export const createDefaultScraperConfig = (
  searchType: InstagramScraperConfig["searchType"] = "hashtag",
  query: string
): InstagramScraperConfig => ({
  addParentData: false,
  directUrls: searchType === "user" ? [`https://www.instagram.com/${query}/`] : [],
  enhanceUserSearchWithFacebookPage: false,
  isUserReelFeedURL: false,
  isUserTaggedFeedURL: false,
  resultsLimit: 100,
  resultsType: "posts",
  searchLimit: 1,
  searchType,
  proxy: {
    useApifyProxy: true,
    apifyProxyGroups: ["RESIDENTIAL"]
  }
});