import { supabaseJson, supabaseResponse } from "./supabase.js";

// Store for chat-dispatched agent runs. Provider correlation ids (Parallel run
// id, Daytona sandbox/session/command) live here so the chat window can poll a
// run after navigation and a cold function can resume it.

export type RunKind = "deep_research" | "enrich" | "find_all" | "gtm_contact";
export type RunStatus = "queued" | "running" | "succeeded" | "failed";
export type RunProvider = "parallel" | "deepline";

export interface AgentRunRow {
  id: string;
  owner_id: string;
  kind: RunKind;
  status: RunStatus;
  title: string;
  objective: string;
  provider: RunProvider;
  provider_run_id: string | null;
  sandbox_id: string | null;
  session_id: string | null;
  command_id: string | null;
  result: unknown;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** Owner-facing projection. Sandbox and provider identifiers are stripped. */
export interface RunView {
  id: string;
  kind: RunKind;
  status: RunStatus;
  title: string;
  objective: string;
  result: unknown;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toRunView(row: AgentRunRow): RunView {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    objective: row.objective,
    result: row.status === "succeeded" ? row.result : null,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertRun(input: {
  ownerId: string;
  kind: RunKind;
  provider: RunProvider;
  title: string;
  objective: string;
}): Promise<AgentRunRow> {
  const rows = await supabaseJson<AgentRunRow[]>("agent_runs?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: input.ownerId,
      kind: input.kind,
      provider: input.provider,
      title: input.title.slice(0, 200),
      objective: input.objective,
      status: "queued",
    }),
  });
  const row = rows[0];
  if (!row) throw new Error("Supabase did not create the agent run.");
  return row;
}

export async function patchRun(id: string, patch: Partial<AgentRunRow>): Promise<void> {
  await supabaseResponse(`agent_runs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

/**
 * Loads a run and asserts ownership. Returns the same null for a missing run and
 * a run owned by somebody else, so run ids cannot be probed.
 */
export async function findOwnedRun(id: string, ownerId: string): Promise<AgentRunRow | null> {
  const rows = await supabaseJson<AgentRunRow[]>(
    `agent_runs?select=*&id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
  );
  return rows[0] ?? null;
}

export async function listRunsByOwner(ownerId: string, limit = 30): Promise<AgentRunRow[]> {
  return supabaseJson<AgentRunRow[]>(
    `agent_runs?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc&limit=${limit}`,
  );
}
