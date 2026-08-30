import Parallel from "parallel-web";

// Parallel client for the three research capabilities the chat window dispatches:
// deep research (Task API, text report), enrichment (Task API, JSON schema), and
// FindAll (lead/entity discovery). Every call is server-side — PARALLEL_API_KEY
// never reaches the browser.

export const PARALLEL_HOSTS = "api.parallel.ai,*.parallel.ai";

function client(): Parallel {
  const apiKey = process.env.PARALLEL_API_KEY;
  if (!apiKey) throw new Error("Parallel is not configured.");
  return new Parallel({ apiKey });
}

export function hasParallel(): boolean {
  return Boolean(process.env.PARALLEL_API_KEY);
}

/** Terminal-state mapping shared by Task API and FindAll (identical status unions). */
type ProviderStatus =
  | "queued"
  | "action_required"
  | "running"
  | "completed"
  | "failed"
  | "cancelling"
  | "cancelled";

export interface RunProgress {
  status: "queued" | "running" | "succeeded" | "failed";
  result: unknown;
  errorMessage: string | null;
}

function mapStatus(status: ProviderStatus): RunProgress["status"] {
  switch (status) {
    case "completed":
      return "succeeded";
    case "failed":
    case "cancelled":
      return "failed";
    case "queued":
      return "queued";
    default:
      return "running";
  }
}

/* ------------------------------------------------------------------ *
 * Deep research — Task API, markdown report with inline citations
 * ------------------------------------------------------------------ */

/** `ultra` and `pro` are the Deep Research processors; runs can take many minutes. */
export async function startDeepResearch(objective: string): Promise<string> {
  const run = await client().taskRun.create({
    input: objective,
    processor: "ultra",
    task_spec: { output_schema: { type: "text" } },
  });
  return run.run_id;
}

/* ------------------------------------------------------------------ *
 * Enrichment — Task API, structured input → structured output
 * ------------------------------------------------------------------ */

export interface EnrichmentField {
  name: string;
  description: string;
}

/**
 * Builds a JSON output schema from the fields the chat agent asked for. The field
 * names and descriptions are user-influenced data, so they are only ever placed
 * into a JSON body — never concatenated into code or a shell command.
 */
export async function startEnrichment(
  subject: string,
  fields: EnrichmentField[],
): Promise<string> {
  const properties: Record<string, { type: "string"; description: string }> = {};
  for (const field of fields) {
    properties[field.name] = { type: "string", description: field.description };
  }

  const run = await client().taskRun.create({
    input: subject,
    processor: "core",
    task_spec: {
      output_schema: {
        type: "json",
        json_schema: {
          type: "object",
          properties,
          required: fields.map((field) => field.name),
          additionalProperties: false,
        },
      },
    },
  });
  return run.run_id;
}

/** Polls a Task API run (deep research or enrichment). */
export async function pollTaskRun(runId: string): Promise<RunProgress> {
  const parallel = client();
  const run = await parallel.taskRun.retrieve(runId);
  const status = mapStatus(run.status);

  if (status === "succeeded") {
    const result = await parallel.taskRun.result(runId);
    return { status, result: result.output, errorMessage: null };
  }
  if (status === "failed") {
    return {
      status,
      result: null,
      errorMessage: run.error?.message ?? "The Parallel task run did not complete.",
    };
  }
  return { status, result: null, errorMessage: null };
}

/* ------------------------------------------------------------------ *
 * FindAll — entity discovery (the VC agent)
 * ------------------------------------------------------------------ */

export interface MatchCondition {
  name: string;
  description: string;
}

export async function startFindAll(input: {
  objective: string;
  entityType: string;
  matchConditions: MatchCondition[];
  matchLimit: number;
}): Promise<string> {
  const run = await client().beta.findall.create({
    objective: input.objective,
    entity_type: input.entityType,
    match_conditions: input.matchConditions,
    generator: "core",
    match_limit: Math.max(1, Math.min(input.matchLimit, 25)),
  });
  return run.findall_id;
}

/**
 * Lets Parallel turn a plain-English objective into an entity type and match
 * conditions, so the chat agent does not have to invent the schema itself.
 */
export async function ingestFindAll(objective: string) {
  return client().beta.findall.ingest({ objective });
}

export async function pollFindAll(findallId: string): Promise<RunProgress> {
  const parallel = client();
  const run = await parallel.beta.findall.retrieve(findallId);
  const status = mapStatus(run.status.status);

  if (status === "succeeded") {
    const result = await parallel.beta.findall.result(findallId);
    // Trim to what the chat window renders; full citations stay server-side.
    const candidates = result.candidates.slice(0, 25).map((candidate) => ({
      name: candidate.name,
      url: candidate.url,
      description: candidate.description,
      matchStatus: candidate.match_status,
      output: candidate.output,
    }));
    return {
      status,
      result: { candidates, matched: candidates.length },
      errorMessage: null,
    };
  }
  if (status === "failed") {
    return {
      status,
      result: null,
      errorMessage:
        run.status.termination_reason ?? "The Parallel FindAll run did not complete.",
    };
  }
  return { status, result: null, errorMessage: null };
}
