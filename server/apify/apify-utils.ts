import fs from 'fs';
import path from 'path';
import actorsData from "./apify_actors.json";

// Define the structure of an Apify entry
interface ApifyEntry {
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    url?: string;
    sourceURL?: string;
    keywords?: string;
    [key: string]: any;
  };
}

// Define the structure for Apify Actors from the full JSON
interface ApifyActor {
  id: string;
  name: string;
  username: string;
  versions: any[];
  createdAt: string;
  modifiedAt: string;
  stats: {
    totalRunCount: number;
    totalRunTimeSeconds: number;
    totalUserCount: number;
    totalUserReviews: number;
    user30DaysCount: number;
    user30DaysNew: number;
    run30DaysCount: number;
  };
  examples: any[];
  description?: string;
  title?: string;
  seoTitle?: string;
  seoDescription?: string;
  categories?: string[];
  thumbUrl?: string;
}

// Define the structure for the simplified actor data based on the diff
interface SimplifiedActor {
  id: string;
  name: string;
  username: string;
  title: string;
  description: string;
  image: string;
  url: string;
  category: string;
  type: string;
  rating: number;
  price: string;
}

// Function to load and parse the Apify Firecrawl data (fallback)
export function loadApifyFirecrawlData(): ApifyEntry[] {
  try {
    // Use a simpler relative path approach
    const filePath = path.join(process.cwd(), 'server', 'apify', 'apify_firecrawl.json');
    console.log(`[ApifyUtils] Attempting to load file from: ${filePath}`);
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData) as ApifyEntry[];
    console.log(`[ApifyUtils] Loaded ${data.length} entries from apify_firecrawl.json`);
    return data;
  } catch (error) {
    console.error('[ApifyUtils] Error loading Apify Firecrawl data:', error);
    // Return sample data if we can't load the file
    return [{
      markdown: "Sample data",
      metadata: {
        title: "Instagram Scraper",
        description: "Scrape posts, comments, and user data from Instagram",
        url: "https://apify.com/instagram-scraper"
      }
    }];
  }
}

// Function to load and parse the Apify Actors data
export function loadApifyActorsData(): ApifyActor[] {
  try {
    const filePath = path.join(process.cwd(), 'server', 'apify', 'apify_actors.json');
    console.log(`[ApifyUtils] Attempting to load file from: ${filePath}`);
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData) as ApifyActor[];
    console.log(`[ApifyUtils] Loaded ${data.length} actors from apify_actors.json`);
    return data;
  } catch (error) {
    console.error('[ApifyUtils] Error loading Apify Actors data:', error);
    return [];
  }
}

// Process the raw actors data into the simplified format
const actors: SimplifiedActor[] = (actorsData as any[]).map((actor: any, index: number): SimplifiedActor => {
  const { title, description, pictureUrl: image, actorPageUrl: url, stats, username } = actor;
  
  // Extract keywords for category/type determination (from description)
  const keywords = description?.toLowerCase().split(' ').map((word: string) => word.replace(/[^a-z0-9]/g, '')) || [];
  const markdown = actor.readme?.toLowerCase() || ''; // Assuming readme might contain markdown
  
  // Simple logic to determine category and type based on keywords/markdown
  let category = 'General';
  let type = 'Tool';
  
  if (markdown.includes('news') || keywords.some((k: string) => k.includes('news'))) {
    category = 'News';
  } else if (markdown.includes('social media') || keywords.some((k: string) => k.includes('social'))) {
    category = 'Social Media';
  } else if (markdown.includes('scraper') || keywords.some((k: string) => k.includes('scraper'))) {
    category = 'Scraping';
  }
  
  if (title.toLowerCase().includes('scraper')) {
    type = 'Scraper';
  } else if (title.toLowerCase().includes('crawler')) {
    type = 'Crawler';
  } else if (title.toLowerCase().includes('downloader')) {
    type = 'Downloader';
  }
  
  return {
    id: `apify-${username}-${index + 1}`, // Changed ID format based on diff pattern
    name: title.replace(' · Apify', '').split(' ').join('-').toLowerCase(),
    username: username || 'unknown', // Use username from actor data if available
    title: title.replace(' · Apify', ''),
    description: description || 'No description available',
    image: image || 'default_image_url', // Provide a default image URL if needed
    url: url || '#', // Provide a default URL if needed
    category,
    type,
    rating: 85 + Math.floor(Math.random() * 15), // Random rating
    price: `$${(9.99 + Math.floor(Math.random() * 20)).toFixed(2)}`, // Random price
  };
});

// Get all actors
export function getApifyActors(): SimplifiedActor[] {
  return actors;
}

// Get a specific actor by ID
export function getApifyActorById(id: string): SimplifiedActor | undefined {
  return actors.find(actor => actor.id === id);
}

// Search actors by query (simplified search logic)
export function searchApifyActors(query: string): SimplifiedActor[] {
  const lowerQuery = query.toLowerCase();
  return actors.filter(actor => 
    actor.title.toLowerCase().includes(lowerQuery) ||
    actor.description.toLowerCase().includes(lowerQuery) ||
    actor.category.toLowerCase().includes(lowerQuery) || // Search category
    actor.type.toLowerCase().includes(lowerQuery) // Search type
  );
}