import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { GTM_TOOLS } from "./deepline.js";

// Tool definitions handed to Claude, plus the Zod schemas the server validates
// tool inputs against before dispatching any provider call. Claude choosing a
// tool is a suggestion; these schemas are the gate.

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "deep_research",
    description:
      "Run Parallel Deep Research and return an analyst-grade markdown report with inline citations. " +
      "Call this when the person wants a market, competitor, industry, or due-diligence report on a topic, " +
      "rather than a list of entities or a single fact. Runs for several minutes in the background.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label for the run, 3-8 words." },
        objective: {
          type: "string",
          description:
            "The research brief in plain English. Be specific about scope, geography, and time period. " +
            "Under 15000 characters.",
        },
      },
      required: ["title", "objective"],
      additionalProperties: false,
    },
  },
  {
    name: "find_all",
    description:
      "Run Parallel FindAll to discover every entity matching a set of conditions — the VC agent. " +
      "Call this when the person wants a LIST of companies, investors, funds, or people that satisfy criteria " +
      "(for example 'all UK VCs investing in Physical AI'). Each match comes back with citations. " +
      "Prefer this over deep_research whenever the answer is a roster rather than a narrative.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label for the run, 3-8 words." },
        objective: { type: "string", description: "The discovery objective in plain English." },
        entity_type: {
          type: "string",
          description:
            "The category of thing being found, snake_case — e.g. venture_capital_firms, companies, people.",
        },
        match_conditions: {
          type: "array",
          description:
            "One condition per independently checkable requirement. Split compound requirements apart.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "snake_case condition name, e.g. uk_location_check." },
              description: {
                type: "string",
                description: "One sentence stating the requirement as a checkable claim.",
              },
            },
            required: ["name", "description"],
            additionalProperties: false,
          },
        },
        match_limit: {
          type: "integer",
          description: "How many matches to return, 1-25. Default 10.",
        },
      },
      required: ["title", "objective", "entity_type", "match_conditions"],
      additionalProperties: false,
    },
  },
  {
    name: "enrich_records",
    description:
      "Run a Parallel enrichment task: take one subject (a company, product, or person) and fill in " +
      "specific researched fields about it, each with citations. Call this when the person names a subject " +
      "and asks for particular attributes — funding, headcount, pricing, competitors.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label for the run, 3-8 words." },
        subject: {
          type: "string",
          description: "The thing being enriched — a company name, product name, or person plus context.",
        },
        fields: {
          type: "array",
          description: "The attributes to research. 1-10 fields.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "snake_case field name, e.g. total_funding." },
              description: {
                type: "string",
                description: "What to look for, including the format the value should take.",
              },
            },
            required: ["name", "description"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "subject", "fields"],
      additionalProperties: false,
    },
  },
  {
    name: "gtm_find_contact",
    description:
      "Run Deepline in an isolated sandbox to find and verify go-to-market contact data — a verified work " +
      "email for a named person, the right role-holder at a company, or an email verification. " +
      "Call this when the person needs contactable GTM data rather than research. " +
      "Deepline needs a one-time browser authorization; if it is not yet authorized the run comes back " +
      "with an authorization link to open.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label for the run, 3-8 words." },
        tool: {
          type: "string",
          enum: [...GTM_TOOLS],
          description:
            "company_to_contact_by_role_waterfall to find a role-holder, company_enrich for company data, " +
            "email_verify to verify a known address.",
        },
        company_name: { type: "string", description: "The company name, when known." },
        domain: { type: "string", description: "The company domain, when known — improves match rate." },
        roles: {
          type: "array",
          description: "Target job titles, for the role waterfall.",
          items: { type: "string" },
        },
        email: { type: "string", description: "The address to verify, for email_verify." },
      },
      required: ["title", "tool"],
      additionalProperties: false,
    },
  },
];

/* ------------------------------------------------------------------ *
 * Server-side validation of tool inputs
 * ------------------------------------------------------------------ */

const title = z.string().trim().min(3).max(120);
const namedField = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,48}$/, "field names must be snake_case"),
  description: z.string().trim().min(3).max(500),
});

export const deepResearchInput = z.object({
  title,
  objective: z.string().trim().min(10).max(15_000),
});

export const findAllInput = z.object({
  title,
  objective: z.string().trim().min(10).max(4_000),
  entity_type: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{2,60}$/, "entity_type must be snake_case"),
  match_conditions: z.array(namedField).min(1).max(8),
  match_limit: z.number().int().min(1).max(25).optional(),
});

export const enrichInput = z.object({
  title,
  subject: z.string().trim().min(2).max(500),
  fields: z.array(namedField).min(1).max(10),
});

export const gtmInput = z.object({
  title,
  tool: z.enum(GTM_TOOLS),
  company_name: z.string().trim().max(200).optional(),
  domain: z.string().trim().max(255).optional(),
  roles: z.array(z.string().trim().min(2).max(120)).max(6).optional(),
  email: z.string().trim().email().max(320).optional(),
});
