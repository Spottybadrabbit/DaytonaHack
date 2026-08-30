import { apiRequest } from "./queryClient";

export type RunKind = "deep_research" | "enrich" | "find_all" | "gtm_contact";
export type RunStatus = "queued" | "running" | "succeeded" | "failed";

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

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatReply {
  reply: string;
  runs: RunView[];
}

/** The specialist behind each run kind, in the site's field-guide voice. */
export const RUN_LABELS: Record<RunKind, { name: string; species: string }> = {
  deep_research: { name: "Deep research", species: "parallel · task api" },
  find_all: { name: "FindAll roster", species: "parallel · findall" },
  enrich: { name: "Enrichment", species: "parallel · task api" },
  gtm_contact: { name: "GTM contact", species: "deepline · daytona sandbox" },
};

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  queued: "Queued",
  running: "Out hunting",
  succeeded: "Returned",
  failed: "Slipped away",
};

export async function sendChat(messages: ChatTurn[], token: string | null): Promise<ChatReply> {
  const res = await apiRequest("POST", "/api/chat", { messages }, token);
  return res.json();
}

export async function fetchRun(id: string, token: string | null): Promise<{ run: RunView }> {
  const res = await apiRequest("GET", `/api/runs/${encodeURIComponent(id)}`, undefined, token);
  return res.json();
}

export async function fetchRuns(token: string | null): Promise<{ runs: RunView[] }> {
  const res = await apiRequest("GET", "/api/runs", undefined, token);
  return res.json();
}
