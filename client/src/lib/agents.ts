/** Sanitized application shape returned by the Supabase-backed Vercel API. */
export interface WildAgent {
  _id: string;
  _creationTime: number;
  name: string;
  description: string;
  price: string;
  ownerId: null;
  status: string;
  type: string;
  performance: string;
  isActive: boolean;
  spriteUrl: string | null;
  apiEndpoint: string | null;
  apiKey: null;
  platform: string | null;
  platformConfig: string | null;
}

export type WildAgentId = string;
