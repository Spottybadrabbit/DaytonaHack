import { ApifyClient } from 'apify-client';

/**
 * Initialize the ApifyClient with the provided token
 * @param token Apify API token
 * @returns Configured ApifyClient instance
 */
export function createApifyClient(token: string) {
  return new ApifyClient({
    token,
  });
}

/**
 * Interface for MCP input parameters
 */
export interface MCPClientInput {
  mcpUrl?: string;
  systemPrompt?: string;
  modelMaxOutputTokens?: number;
  maxNumberOfToolCallsPerQuery?: number;
  toolCallTimeoutSec?: number;
  customParameters?: Record<string, any>;
}

/**
 * Default parameters for the MCP client
 */
export const DEFAULT_MCP_INPUT: MCPClientInput = {
  mcpUrl: "https://actors-mcp-server.apify.actor/sse?enableAddingActors=true",
  systemPrompt: `You are a helpful Agents in the Wild assistant with tools called Actors.
        
    Your goal is to help users discover the best Actors for scraping and web automation.
    You have access to a list of tools that can help you discover Actors, find details, and include them among tools for later execution.
    
    Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to LLMs.
    
    Choose the appropriate Actor based on the conversation context. If no Actor is needed, reply directly.
    
    Prefer Actors with more users, stars, and runs.
    When you need to use an Actor, explain how it is used and with which parameters.
    Never call an Actor unless it is required by the user!
    After receiving an Actor's response:
    1. Transform the raw data into a natural, conversational response.
    2. Keep responses concise but informative.
    3. Focus on the most relevant information.
    4. Use appropriate context from the user's question.
    5. Avoid simply repeating the raw data.
    Always use 'Actor', not 'actor'. Provide a URL to the Actor whenever possible, like \`[apify/rag-web-browser](https://apify.com/apify/rag-web-browser)\`.
    REMEMBER: Always limit the number of results returned from Actors.
    There is always a parameter such as \`maxResults=1\`, \`maxPage=1\`, \`maxCrawledPlacesPerSearch=1\`. Keep it to the minimal value.
    Otherwise, Actor execution takes a long time and the result can be huge!
    Always inform the user that calling an Actor might take some time.`,
  modelMaxOutputTokens: 2048,
  maxNumberOfToolCallsPerQuery: 10,
  toolCallTimeoutSec: 300,
};

/**
 * Run the MCP client and return results
 * @param token Apify API token
 * @param customInput Optional custom input parameters to override defaults
 * @returns The actor run result
 */
export async function runMCPClient(token: string, customInput: Partial<MCPClientInput> = {}) {
  try {
    const client = createApifyClient(token);
    
    // Merge default input with custom parameters
    const input = {
      ...DEFAULT_MCP_INPUT,
      ...customInput
    };
    
    console.log("[MCP Client] Starting MCP client actor with input:", 
      { ...input, systemPrompt: input.systemPrompt?.substring(0, 50) + '...' });
    
    // Run the Actor and wait for it to finish
    const run = await client.actor("jiri.spilka/tester-mcp-client").call(input);
    
    console.log('[MCP Client] Actor run completed successfully');
    console.log(`[MCP Client] Check data here: https://console.apify.com/storage/datasets/${run.defaultDatasetId}`);
    
    // Fetch and return Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    return {
      success: true,
      run,
      results: items,
      datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
    };
  } catch (error) {
    console.error('[MCP Client] Error running MCP client:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get available actors for the MCP client
 * @param token Apify API token
 * @returns List of available actors
 */
export async function getAvailableActors(token: string) {
  try {
    const client = createApifyClient(token);
    
    // This is a mock implementation - in a real app, we would call an API
    // to get the available actors for the MCP client
    const actors = await client.actors().list();
    
    return {
      success: true,
      actors: actors.items
    };
  } catch (error) {
    console.error('[MCP Client] Error getting available actors:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}