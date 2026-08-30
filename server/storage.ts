import { Agent, InsertAgent, agents } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { Decimal } from "decimal.js";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { getRandomTechPokemonId } from "../client/src/lib/utils";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);
type DbClient = typeof import("./db").db;

export interface IStorage {
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgentStatus(id: number, status: string): Promise<Agent>;
}

export class MemStorage implements IStorage {
  private agents: Map<number, Agent>;
  private currentAgentId: number;

  constructor() {
    this.agents = new Map();
    this.currentAgentId = 1;

    // Initialize sample agents
    this.initializeSampleAgents();
  }

  private initializeSampleAgents() {
    try {
      // Adjusted sample data to match InsertAgent schema more closely
      const sampleAgentsData: Omit<InsertAgent, 'id' | 'ownerId'>[] = [
        {
          name: "Sample Instagram Agent",
          description: "A sample agent for Instagram",
          price: "10.00",
          type: "Social Media",
          platform: "instagram", 
          platformConfig: JSON.stringify({resultsLimit: 10}), // Example config
        },
        {
          name: "Sample LinkedIn Agent",
          description: "A sample agent for LinkedIn",
          price: "20.00",
          type: "Professional Networking",
          platform: "linkedin",
          platformConfig: JSON.stringify({searchLimit: 5}), // Example config
        },
      ];

      sampleAgentsData.forEach((agentData) => {
        // Construct full Agent object with defaults
        const newAgent: Agent = {
          id: this.currentAgentId++,
          name: agentData.name,
          description: agentData.description,
          price: agentData.price,
          ownerId: null,
          status: "idle",
          type: agentData.type,
          performance: "0",
          isActive: false,
          spriteUrl: getRandomTechPokemonId(),
          apiEndpoint: null,
          apiKey: null,
          platform: agentData.platform,
          platformConfig: agentData.platformConfig ?? null,
        };
        this.agents.set(newAgent.id, newAgent);
      });
      console.log(`[Storage] Initialized ${sampleAgentsData.length} sample agents.`);
    } catch (error) {
      console.error("[Storage] Error initializing sample agents:", error);
    }
  }

  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    // Construct full Agent object with defaults
    const newAgent: Agent = {
      id: this.currentAgentId++, 
      name: agent.name,
      description: agent.description,
      price: agent.price,
      ownerId: null,
      status: "idle",
      type: agent.type,
      performance: "0",
      isActive: false,
      spriteUrl: getRandomTechPokemonId(),
      apiEndpoint: null,
      apiKey: null,
      platform: agent.platform,
      platformConfig: agent.platformConfig ?? null,
    };
    this.agents.set(newAgent.id, newAgent);
    return newAgent;
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error("Agent not found");
    }
    agent.status = status;
    return agent;
  }
}

export class DatabaseStorage implements IStorage {
  private constructor(private db: DbClient) {}

  static async create(): Promise<DatabaseStorage> {
    const { db } = await import("./db");
    const storage = new DatabaseStorage(db);
    await storage.initializeData();
    return storage;
  }

  private async initializeData() {
    try {
      // Check if we have agents
      const existingAgents = await this.db.select().from(agents);
      
      if (existingAgents.length === 0) {
        // Create sample agents
        await this.createSampleAgents();
      }
    } catch (error) {
      console.error("[Storage] Error initializing data:", error);
    }
  }

  private async createSampleAgents() {
    try {
      // Adjusted sample data to match InsertAgent schema more closely
      const sampleAgentsData: Omit<InsertAgent, 'id' | 'ownerId'>[] = [
        {
          name: "Sample Instagram Agent",
          description: "A sample agent for Instagram",
          price: "10.00",
          type: "Social Media",
          platform: "instagram",
          platformConfig: JSON.stringify({resultsLimit: 10}), // Example config
        },
        {
          name: "Sample LinkedIn Agent",
          description: "A sample agent for LinkedIn",
          price: "20.00",
          type: "Professional Networking",
          platform: "linkedin",
          platformConfig: JSON.stringify({searchLimit: 5}), // Example config
        },
      ];

      // Map InsertAgent data to full Agent schema for insertion, setting defaults
      const agentsToInsert = sampleAgentsData.map(agentData => ({
        name: agentData.name,
        description: agentData.description,
        price: agentData.price,
        ownerId: null,
        status: "idle",
        type: agentData.type,
        performance: "0",
        isActive: false,
        spriteUrl: getRandomTechPokemonId(),
        apiEndpoint: null,
        apiKey: null,
        platform: agentData.platform,
        platformConfig: agentData.platformConfig ?? null,
      }));

      await this.db.insert(agents).values(agentsToInsert);
      console.log(`[Storage] Created ${sampleAgentsData.length} sample agents.`);
    } catch (error) {
      console.error("[Storage] Error creating sample agents:", error);
    }
  }

  async getAgents(): Promise<Agent[]> {
    return this.db.select().from(agents);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await this.db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    // Map InsertAgent data to full Agent schema for insertion, setting defaults
    const agentToInsert = {
        name: agent.name,
        description: agent.description,
        price: agent.price,
        ownerId: null,
        status: "idle",
        type: agent.type,
        performance: "0",
        isActive: false,
        spriteUrl: getRandomTechPokemonId(),
        apiEndpoint: null,
        apiKey: null,
        platform: agent.platform,
        platformConfig: agent.platformConfig ?? null,
      };
      
    const [newAgent] = await this.db
      .insert(agents)
      .values(agentToInsert)
      .returning();
    if (!newAgent) {
      throw new Error("Failed to create agent");
    }
    return newAgent;
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent> {
    const [updatedAgent] = await this.db
      .update(agents)
      .set({ status })
      .where(eq(agents.id, id))
      .returning();
    if (!updatedAgent) {
      throw new Error("Agent not found or failed to update");
    }
    return updatedAgent;
  }
}

export const storage: IStorage = process.env.DATABASE_URL
  ? await DatabaseStorage.create()
  : new MemStorage();
