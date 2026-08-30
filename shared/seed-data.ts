/**
 * Seed data shared by the Vercel serverless API functions.
 *
 * The app was originally built around an Express backend with in-memory
 * (MemStorage) sample data. On the static Vercel deploy there is no
 * long-running server, so these lightweight serverless functions serve the
 * same shape of data. No database or external Apify token is required.
 *
 * Types are declared locally (rather than imported from ./schema) so this
 * module has zero runtime dependencies and bundles cleanly into a function.
 */

export interface SeedAgent {
  id: number;
  name: string;
  description: string;
  price: string;
  ownerId: number | null;
  status: string;
  type: string;
  performance: string;
  isActive: boolean;
  spriteUrl: string;
  apiEndpoint: string | null;
  apiKey: string | null;
  platform: string | null;
  platformConfig: string | null;
}

export interface SeedActorStats {
  totalRunCount: number;
  totalUserCount: number;
  user30DaysCount: number;
  run30DaysCount: number;
}

export interface SeedActor {
  id: string;
  name: string;
  username: string;
  title: string;
  description: string;
  price?: string;
  rating?: number;
  type?: string;
  categories?: string[];
  stats?: SeedActorStats;
}

function agent(partial: Partial<SeedAgent> & Pick<SeedAgent, "id" | "name" | "description" | "type" | "price" | "performance" | "spriteUrl">): SeedAgent {
  return {
    ownerId: null,
    status: "idle",
    isActive: false,
    apiEndpoint: null,
    apiKey: null,
    platform: null,
    platformConfig: null,
    ...partial,
  };
}

export const seedAgents: SeedAgent[] = [
  agent({
    id: 1,
    name: "Instagram Growth Agent",
    description:
      "Autonomously scrapes profiles, posts, and comments from Instagram to surface engagement trends and growth opportunities.",
    type: "Social Media",
    price: "149.99",
    performance: "92.5",
    spriteUrl: "137",
    status: "running",
    isActive: true,
    platform: "instagram",
    platformConfig: JSON.stringify({ resultsLimit: 100, resultsType: "posts" }),
  }),
  agent({
    id: 2,
    name: "LinkedIn Prospector",
    description:
      "Finds and enriches leads from LinkedIn profiles, companies, and job listings — ideal for autonomous B2B research.",
    type: "Professional Networking",
    price: "179.99",
    performance: "91.7",
    spriteUrl: "233",
    platform: "linkedin",
    platformConfig: JSON.stringify({ searchLimit: 25 }),
  }),
  agent({
    id: 3,
    name: "Twitter Trend Scout",
    description:
      "Collects tweets, profiles, and followers from X to track emerging topics and sentiment in real time.",
    type: "Research",
    price: "129.99",
    performance: "90.2",
    spriteUrl: "474",
    platform: "twitter",
  }),
  agent({
    id: 4,
    name: "Web Research Agent",
    description:
      "Extracts structured data from any website with advanced crawling, then summarizes findings into a report.",
    type: "Development",
    price: "249.99",
    performance: "96.1",
    spriteUrl: "376",
    status: "running",
    isActive: true,
  }),
  agent({
    id: 5,
    name: "Content Creator",
    description:
      "Generates and schedules engaging content across multiple platforms from a single brief.",
    type: "Creative",
    price: "199.99",
    performance: "94.8",
    spriteUrl: "385",
  }),
  agent({
    id: 6,
    name: "Market Analyst",
    description:
      "Monitors competitor pricing and product data, delivering a structured analysis on a schedule you define.",
    type: "Analytics",
    price: "189.99",
    performance: "93.4",
    spriteUrl: "462",
  }),
];

export const seedActors: SeedActor[] = [
  {
    id: "1",
    name: "content-creator",
    username: "apify",
    title: "Content Creator",
    description: "Creates engaging content across multiple platforms.",
    rating: 94.8,
    price: "$199.99",
    type: "Creative",
    categories: ["Content", "Marketing"],
    stats: { totalRunCount: 15487, totalUserCount: 432, user30DaysCount: 98, run30DaysCount: 3256 },
  },
  {
    id: "2",
    name: "instagram-scraper",
    username: "apify",
    title: "Instagram Scraper",
    description: "Extract profiles, posts, and comments from Instagram.",
    rating: 92.5,
    price: "$149.99",
    type: "Research",
    categories: ["Social Media", "Marketing"],
    stats: { totalRunCount: 42000, totalUserCount: 2100, user30DaysCount: 720, run30DaysCount: 10800 },
  },
  {
    id: "3",
    name: "twitter-scraper",
    username: "apify",
    title: "Twitter Scraper",
    description: "Collect tweets, profiles, and followers from Twitter/X.",
    rating: 90.2,
    price: "$129.99",
    type: "Research",
    categories: ["Social Media", "Data Mining"],
    stats: { totalRunCount: 28500, totalUserCount: 1450, user30DaysCount: 510, run30DaysCount: 7200 },
  },
  {
    id: "4",
    name: "web-scraper",
    username: "apify",
    title: "Web Scraper",
    description: "Extract data from any website with advanced capabilities.",
    rating: 96.1,
    price: "$249.99",
    type: "Development",
    categories: ["Scraping", "Development"],
    stats: { totalRunCount: 51200, totalUserCount: 2600, user30DaysCount: 840, run30DaysCount: 12400 },
  },
  {
    id: "5",
    name: "linkedin-scraper",
    username: "apify",
    title: "LinkedIn Scraper",
    description: "Extract profiles, jobs, and companies from LinkedIn.",
    rating: 91.7,
    price: "$179.99",
    type: "Research",
    categories: ["Business", "Recruiting"],
    stats: { totalRunCount: 32000, totalUserCount: 1600, user30DaysCount: 580, run30DaysCount: 8200 },
  },
  {
    id: "6",
    name: "facebook-scraper",
    username: "apify",
    title: "Facebook Scraper",
    description: "Collect posts, profiles, and comments from Facebook.",
    rating: 89.3,
    price: "$159.99",
    type: "Research",
    categories: ["Social Media", "Marketing"],
    stats: { totalRunCount: 35000, totalUserCount: 1800, user30DaysCount: 650, run30DaysCount: 9500 },
  },
  {
    id: "7",
    name: "email-extractor",
    username: "apify",
    title: "Email Extractor",
    description: "Find and extract email addresses from websites.",
    rating: 88.9,
    price: "$99.99",
    type: "Automation",
    categories: ["Automation", "Lead Generation"],
    stats: { totalRunCount: 21000, totalUserCount: 980, user30DaysCount: 320, run30DaysCount: 5100 },
  },
  {
    id: "8",
    name: "amazon-scraper",
    username: "apify",
    title: "Amazon Scraper",
    description: "Extract products, reviews, and prices from Amazon.",
    rating: 93.4,
    price: "$189.99",
    type: "Analytics",
    categories: ["E-commerce", "Analytics"],
    stats: { totalRunCount: 39500, totalUserCount: 1950, user30DaysCount: 700, run30DaysCount: 9900 },
  },
  {
    id: "9",
    name: "google-maps-scraper",
    username: "apify",
    title: "Google Maps Scraper",
    description: "Extract business data and reviews from Google Maps.",
    rating: 92.8,
    price: "$169.99",
    type: "Analytics",
    categories: ["Local", "Analytics"],
    stats: { totalRunCount: 47000, totalUserCount: 2350, user30DaysCount: 790, run30DaysCount: 11200 },
  },
  {
    id: "10",
    name: "youtube-scraper",
    username: "apify",
    title: "YouTube Scraper",
    description: "Collect videos, channels, and comments from YouTube.",
    rating: 91.5,
    price: "$139.99",
    type: "Creative",
    categories: ["Content", "Social Media"],
    stats: { totalRunCount: 26800, totalUserCount: 1320, user30DaysCount: 470, run30DaysCount: 6600 },
  },
  {
    id: "11",
    name: "data-enricher",
    username: "apify",
    title: "Data Enricher",
    description: "Enhance your data with additional information from various sources.",
    rating: 87.6,
    price: "$119.99",
    type: "Analytics",
    categories: ["Data Mining", "Automation"],
    stats: { totalRunCount: 18400, totalUserCount: 870, user30DaysCount: 290, run30DaysCount: 4300 },
  },
  {
    id: "12",
    name: "shopify-scraper",
    username: "apify",
    title: "Shopify Scraper",
    description: "Extract products, prices, and reviews from Shopify stores.",
    rating: 90.8,
    price: "$159.99",
    type: "Finance",
    categories: ["E-commerce", "Finance"],
    stats: { totalRunCount: 22600, totalUserCount: 1120, user30DaysCount: 400, run30DaysCount: 5600 },
  },
  {
    id: "13",
    name: "google-search-scraper",
    username: "apify",
    title: "Google Search Results Scraper",
    description: "Scrape Google SERPs — organic and paid results, People Also Ask, prices, and reviews.",
    rating: 95.2,
    price: "$219.99",
    type: "Analytics",
    categories: ["Search", "SEO"],
    stats: { totalRunCount: 50000, totalUserCount: 2500, user30DaysCount: 800, run30DaysCount: 12000 },
  },
  {
    id: "14",
    name: "website-content-crawler",
    username: "apify",
    title: "Website Content Crawler",
    description: "Extract all content from any website with JavaScript rendering and custom processing.",
    rating: 94.0,
    price: "$229.99",
    type: "Crawler",
    categories: ["Scraping", "Content"],
    stats: { totalRunCount: 38000, totalUserCount: 1900, user30DaysCount: 680, run30DaysCount: 9800 },
  },
];
