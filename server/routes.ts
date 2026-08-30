import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAgentSchema } from "@shared/schema";
import { getApifyActors, getApifyActorById, searchApifyActors } from "./apify/apify-utils";
import { runMCPClient, DEFAULT_MCP_INPUT, getAvailableActors } from "./apify/mcp-client";
import fs from 'fs';
import path from 'path';

export function registerRoutes(app: Express): Server {
  // Get all marketplace agents
  app.get("/api/agents", async (_req, res) => {
    const agents = await storage.getAgents();
    res.json(agents);
  });

  // Get single agent
  app.get("/api/agents/:id", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));
    if (!agent) return res.sendStatus(404);
    res.json(agent);
  });

  // Create agent
  app.post("/api/agents", async (req, res) => {
    console.log("[Agent Creation] Starting agent creation process");

    try {
      console.log("[Agent Creation] Validating request body:", req.body);
      const parsedResult = insertAgentSchema.safeParse(req.body);
      
      if (!parsedResult.success) {
        console.error("[Agent Creation] Validation error:", parsedResult.error);
        return res.status(400).json({ error: "Invalid agent data", details: parsedResult.error.format() });
      }

      const agentData = parsedResult.data;
      
      // Ensure platformConfig is valid JSON if it exists
      if (agentData.platformConfig && typeof agentData.platformConfig === 'string') {
        try {
          // Validate it's proper JSON
          JSON.parse(agentData.platformConfig);
        } catch (e) {
          console.error("[Agent Creation] Invalid platform config JSON:", e);
          return res.status(400).json({ error: "Invalid platform configuration format" });
        }
      }

      console.log("[Agent Creation] Creating agent with data:", agentData);
      const agent = await storage.createAgent(agentData);
      console.log("[Agent Creation] Agent created successfully:", agent);
      res.status(201).json(agent);
    } catch (error: any) {
      console.error("[Agent Creation] Error creating agent:", error);
      res.status(500).json({ 
        error: "Failed to create agent", 
        message: error.message || "Unknown error" 
      });
    }
  });

  // Instagram Scraper Task API Routes

  // Run task asynchronously
  app.post("/api/agents/:id/instagram-task/run", async (req, res) => {
    console.log("[Instagram Task] Starting task for agent:", req.params.id);

    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      const config = JSON.parse(agent.platformConfig || "{}");
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/runs?token=${process.env.APIFY_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        }
      );

      if (!response.ok) {
        throw new Error(`Task run failed: ${await response.text()}`);
      }

      const result = await response.json();
      await storage.updateAgentStatus(agent.id, `task:${result.data.id}`);

      res.json({
        status: "success",
        taskId: result.data.id,
        message: "Task started successfully"
      });
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // In the abort task endpoint
  app.post("/api/agents/:id/instagram-task/abort", async (req, res) => {
    console.log("[Instagram Task] Aborting task for agent:", req.params.id);

    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      // Extract run ID from agent status
      const runId = agent.status.startsWith('task:') ? agent.status.split(':')[1] : null;
      if (!runId) {
        throw new Error('No active run to abort');
      }

      // First abort the actor run
      const abortResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/abort?token=${process.env.APIFY_API_KEY}`,
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!abortResponse.ok) {
        throw new Error(`Failed to abort actor run: ${await abortResponse.text()}`);
      }

      // Update agent status to idle immediately
      await storage.updateAgentStatus(agent.id, "idle");

      // Verify the run was stopped
      const verifyResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_API_KEY}`,
        {
          method: "GET",
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!verifyResponse.ok) {
        throw new Error(`Failed to verify run status: ${await verifyResponse.text()}`);
      }

      const verifyData = await verifyResponse.json();
      console.log("[Instagram Task] Actor run status after abort:", verifyData.status);

      res.json({ 
        status: "success", 
        message: "Task aborted and agent returned to idle state" 
      });
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  // Get task details
  app.get("/api/agents/:id/instagram-task", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task?token=${process.env.APIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get task details: ${await response.text()}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update task settings
  app.put("/api/agents/:id/instagram-task", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task?token=${process.env.APIFY_API_KEY}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update task settings: ${await response.text()}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete task
  app.delete("/api/agents/:id/instagram-task", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task?token=${process.env.APIFY_API_KEY}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${await response.text()}`);
      }

      res.sendStatus(204);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get task input
  app.get("/api/agents/:id/instagram-task/input", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/input?token=${process.env.APIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get task input: ${await response.text()}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update task input
  app.put("/api/agents/:id/instagram-task/input", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/input?token=${process.env.APIFY_API_KEY}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update task input: ${await response.text()}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get last run details
  app.get("/api/agents/:id/instagram-task/last-run", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/runs/last?token=${process.env.APIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get last run details: ${await response.text()}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Run task synchronously
  app.post("/api/agents/instagram-task/run-sync", async (req, res) => {
    console.log("[Instagram Task] Starting synchronous task");

    const taskConfig = req.body;
    console.log('[Instagram Task] Config:', JSON.stringify(taskConfig, null, 2));

    // Add basic validation
    if (!taskConfig || typeof taskConfig !== 'object') {
      console.error("[Instagram Task] Invalid task configuration:", taskConfig);
      return res.status(400).json({ error: "Invalid task configuration" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    console.log("[Instagram Task] Sending request to Apify API");
    try {
      const response = await fetch(
        'https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/run-sync-get-dataset-items?token=' +
        process.env.APIFY_API_KEY,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(taskConfig),
          signal: controller.signal
        }
      ).finally(() => clearTimeout(timeout));

      console.log("[Instagram Task] Apify API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Instagram Task] Apify API error response:", errorText);
        throw new Error('Failed to execute Instagram task: ' + errorText);
      }

      console.log("[Instagram Task] Parsing response");
      const results = await response.json();
      console.log("[Instagram Task] Retrieved", results?.length || 0, "results");
      
      res.json({
        status: "success",
        data: results
      });
    } catch (fetchError: any) {
      console.error("[Instagram Task] Fetch error:", fetchError);
      if (fetchError.name === 'AbortError') {
        res.status(408).json({ error: "Instagram task timed out" });
      } else {
        res.status(500).json({ 
          error: fetchError.message || "Unknown error",
          details: fetchError.stack
        });
      }
    }
  });

  // Get task runs list
  app.get("/api/agents/:id/instagram-task/runs", async (req, res) => {
    console.log("[Instagram Task] Getting runs list for agent:", req.params.id);
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/runs?token=${process.env.APIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get task runs: ${await response.text()}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get dataset items for a specific run
  app.get("/api/agents/:id/instagram-task/dataset-items", async (req, res) => {
    console.log("[Instagram Task] Getting dataset items for agent:", req.params.id);
    console.log("[Instagram Task] Request headers:", req.headers);
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/run-sync-get-dataset-items?token=${process.env.APIFY_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(JSON.parse(agent.platformConfig || "{}")),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get dataset items: ${await response.text()}`);
      }

      const items = await response.json();
      res.json({
        status: "success",
        data: items
      });
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get last run dataset items
  app.get("/api/agents/:id/instagram-task/last-run/dataset-items", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/runs/last/dataset/items?token=${process.env.APIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get last run dataset items: ${await response.text()}`);
      }

      const items = await response.json();
      console.log('[Instagram Task] Dataset items:', items);
      res.json({
        status: "success",
        data: items
      });
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get task webhooks
  app.get("/api/agents/:id/instagram-task/webhooks", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/webhooks?token=${process.env.APIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get task webhooks: ${await response.text()}`);
      }

      const webhooks = await response.json();
      res.json(webhooks);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
    // Add this endpoint with the other Instagram task endpoints

  // Get task logs
  app.get("/api/agents/:id/instagram-task/logs", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);
    if (agent.platform !== "instagram") return res.status(400).json({ error: "Agent is not configured for Instagram" });

    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      const response = await fetch(
        `https://api.apify.com/v2/actor-tasks/spottybadrabbit~instagram-scraper-task/runs/last/log?token=${process.env.APIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get task logs: ${await response.text()}`);
      }

      const logs = await response.text();
      res.send(logs);
    } catch (error: any) {
      console.error("[Instagram Task] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update agent status
  app.patch("/api/agents/:id/status", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));
    if (!agent) return res.sendStatus(404);

    const { status } = req.body;
    if (typeof status !== "string") return res.sendStatus(400);

    const updatedAgent = await storage.updateAgentStatus(agent.id, status);
    res.json(updatedAgent);
  });

  // Apify actors endpoints
  app.get("/api/apify/actors", async (req, res) => {
    try {
      // Simplified logic based on diff
      const { query } = req.query;
      let actors;
      if (typeof query === 'string' && query.trim() !== '') {
        console.log(`[Apify Actors] Searching actors with query: ${query}`);
        actors = await searchApifyActors(query);
      } else {
        console.log("[Apify Actors] Getting all available actors");
        actors = await getApifyActors();
      }
      console.log(`[Apify Actors] Found ${actors.length} actors`);
      res.json(actors);
    } catch (error: any) {
      console.error("[Apify Actors] Error fetching actors:", error);
      res.status(500).json({ error: "Failed to fetch Apify actors", message: error.message });
    }
  });

  app.get("/api/apify/actors/:actorId", async (req, res) => {
    const { actorId } = req.params;
    console.log(`[Apify Actor] Getting details for actor: ${actorId}`);
    try {
      const actorDetails = await getApifyActorById(actorId);
      if (!actorDetails) {
        console.log(`[Apify Actor] Actor not found: ${actorId}`);
        return res.status(404).json({ error: "Actor not found" });
      }
      console.log(`[Apify Actor] Successfully retrieved details for actor: ${actorId}`);
      res.json(actorDetails);
    } catch (error: any) {
      console.error(`[Apify Actor] Error fetching details for actor ${actorId}:`, error);
      res.status(500).json({ error: "Failed to fetch actor details", message: error.message });
    }
  });
  
  // MCP Client endpoints
  
  // Run MCP client with agent
  app.post("/api/agents/:id/mcp", async (req, res) => {
    const agent = await storage.getAgent(parseInt(req.params.id));

    if (!agent) return res.sendStatus(404);

    try {
      // Check for API token
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }
      
      // Parse custom configuration if provided
      const customConfig = req.body.config || {};
      
      // Get system prompt from the agent if available
      let systemPrompt = DEFAULT_MCP_INPUT.systemPrompt;
      if (agent.description) {
        systemPrompt = `${systemPrompt}\n\nAdditional context: ${agent.description}`;
      }
      
      // Start the MCP client
      const result = await runMCPClient(process.env.APIFY_API_KEY, {
        ...customConfig,
        systemPrompt
      });
      
      if (!result.success) {
        throw new Error(result.error || "Failed to run MCP client");
      }
      
      // Update agent status
      await storage.updateAgentStatus(agent.id, "mcp:running");
      
      res.json({
        success: true,
        message: "MCP client started successfully",
        data: result
      });
    } catch (error: any) {
      console.error("[MCP Client] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get available actors for MCP
  app.get("/api/apify/mcp/actors", async (req, res) => {
    try {
      if (!process.env.APIFY_API_KEY) {
        throw new Error("APIFY_API_KEY is not configured");
      }
      
      const result = await getAvailableActors(process.env.APIFY_API_KEY);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to get available actors");
      }
      
      res.json(result.actors);
    } catch (error: any) {
      console.error("[MCP Client] Error fetching available actors:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate sample Apify actors data
  app.post("/api/apify/fetch-actors", async (req, res) => {
    console.log("[Apify Agent] Starting Apify actor sample data generation");
    // Passport was removed with the orphaned server/auth.ts; nothing populates
    // req.user on this legacy Express server, so this guard always rejects —
    // matching its previous (never-authenticated) behavior. Clerk-verified
    // access for the production serverless API lives in api/_lib/clerk.ts.
    if (!(req as { user?: unknown }).user) {
      console.log("[Apify Agent] Authentication required");
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      // Instead of executing Python script, we'll create sample data
      console.log("[Apify Agent] Using sample actor data instead of Python execution");
      
      try {
        // Create the apify directory if it doesn't exist
        const apifyDir = path.join(process.cwd(), 'server', 'apify');
        if (!fs.existsSync(apifyDir)) {
          fs.mkdirSync(apifyDir, { recursive: true });
          console.log("[Apify Agent] Created apify directory");
        }
        
        // Check if the apify_actors.json file already exists
        const actorsFilePath = path.join(apifyDir, 'apify_actors.json');
        
        if (fs.existsSync(actorsFilePath)) {
          console.log("[Apify Agent] Using existing actors data file");
          // File exists, just return success
          return res.status(200).json({ 
            status: "success",
            message: "Actors data already available" 
          });
        }
        
        // File doesn't exist, create a sample actors file with top performers
        const topActors = [
          {
            id: "google-search-scraper",
            name: "google-search-scraper",
            username: "apify",
            title: "Google Search Results Scraper",
            description: "Scrape Google Search Engine Results Pages (SERPs). Select the country or language and extract organic and paid results. AI overview, ads, queries, People Also Ask, prices, reviews, use a Google SERP API. Export scraped data, run the scraper via API, schedule runs, or integrate with other tools.",
            categories: ["Search", "SEO", "Data Mining"],
            type: "Scraping",
            stats: {
              totalRunCount: 50000,
              totalUserCount: 2500,
              user30DaysCount: 800,
              run30DaysCount: 12000
            }
          },
          {
            id: "facebook-pages-scraper",
            name: "facebook-pages-scraper",
            username: "apify",
            title: "Facebook Pages Scraper",
            description: "Extract basic data from multiple Facebook Pages or Profiles. Extract Facebook page details, website, email, address, messenger, likes, followers, rating, ad running info, and other public data. Export scraped data, schedule scraper via API, integrate with other tools or AI workflows.",
            categories: ["Social Media", "Marketing", "Data Mining"],
            type: "Scraping",
            stats: {
              totalRunCount: 35000,
              totalUserCount: 1800,
              user30DaysCount: 650,
              run30DaysCount: 9500
            }
          },
          {
            id: "instagram-api-scraper",
            name: "instagram-api-scraper",
            username: "apify",
            title: "Instagram API Scraper",
            description: "Scrape and download Instagram posts, profiles, places, hashtags, photos without login. Supports search keywords and URLs lists. Download images in HTML, JSON, CSV, Excel, XML, and RSS feed.",
            categories: ["Social Media", "Marketing", "Content"],
            type: "API",
            stats: {
              totalRunCount: 42000,
              totalUserCount: 2100,
              user30DaysCount: 720,
              run30DaysCount: 10800
            }
          },
          {
            id: "website-content-crawler",
            name: "website-content-crawler",
            username: "apify",
            title: "Website Content Crawler",
            description: "Extract all content from any website with a single click. Supports JavaScript rendering, CSV/JSON/Excel exports, and custom data processing.",
            categories: ["Scraping", "Content", "SEO"],
            type: "Crawler",
            stats: {
              totalRunCount: 38000,
              totalUserCount: 1900,
              user30DaysCount: 680,
              run30DaysCount: 9800
            }
          },
          {
            id: "linkedin-data-scraper",
            name: "linkedin-data-scraper",
            username: "apify",
            title: "LinkedIn Data Scraper",
            description: "Extract data from LinkedIn profiles, companies, and job listings without login. Great for lead generation and market research.",
            categories: ["Business", "Recruiting", "Marketing"],
            type: "Scraping",
            stats: {
              totalRunCount: 32000,
              totalUserCount: 1600,
              user30DaysCount: 580,
              run30DaysCount: 8200
            }
          }
        ];
        
        // Create more sample actors to reach 50+ for pagination demonstration
        const moreActors = [];
        for (let i = 1; i <= 45; i++) {
          moreActors.push({
            id: `demo-actor-${i}`,
            name: `demo-actor-${i}`,
            username: "apify",
            title: `Demo Actor ${i}`,
            description: `This is a sample actor ${i} for pagination demonstration.`,
            categories: ["Demo", "Testing"],
            type: "Demo",
            stats: {
              totalRunCount: Math.floor(Math.random() * 10000),
              totalUserCount: Math.floor(Math.random() * 1000),
              user30DaysCount: Math.floor(Math.random() * 300),
              run30DaysCount: Math.floor(Math.random() * 2000)
            }
          });
        }
        
        // Combine the real top actors with the demo actors
        const allActors = [...topActors, ...moreActors];
        
        // Write the data to the file
        fs.writeFileSync(actorsFilePath, JSON.stringify(allActors, null, 2));
        console.log("[Apify Agent] Created sample actors data file with top performers");
        
        return res.status(200).json({ 
          status: "success",
          message: "Actors data created successfully" 
        });
      } catch (fileError: any) {
        console.error("[Apify Agent] Error creating sample actors data:", fileError);
        return res.status(500).json({ error: "Failed to create sample actors data" });
      }
    } catch (error: any) {
      console.error("[Apify Agent] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}