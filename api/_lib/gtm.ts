import { randomUUID } from "node:crypto";
import { Daytona } from "@daytona/sdk";
import {
  supabaseJson,
  supabaseResponse,
} from "./supabase.js";
import { GTM_DIR, GTM_AGENT, GTM_STATE, GTM_ICP, GTM_SUPPRESSION, GTM_SEND_QUEUE, gtmAgentSource } from "./gtm-runner.js";

const PARALLEL_HOSTS = "api.parallel.ai,*.parallel.ai";
const DEEPLINE_HOSTS = "deepline.com,*.deepline.com,code.deepline.com,registry.npmjs.org,*.npmjs.org";

type GtmStatus = "idle" | "hunting" | "paused" | "error";

export interface GtmAgentRow {
  id: string;
  agent_id: string;
  owner_id: string;
  status: GtmStatus;
  mode: "draft" | "autosend";
  icp: Record<string, unknown>;
  limits: Record<string, unknown>;
  state: Record<string, unknown>;
  sandbox_id?: string;
  session_id?: string;
  command_id?: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GtmLeadRow {
  id: string;
  agent_id: string;
  owner_id: string;
  company_name: string | null;
  domain: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  verification: unknown;
  source_payload: unknown;
  created_at: string;
}

export interface GtmOutreachRow {
  id: string;
  agent_id: string;
  lead_id: string | null;
  owner_id: string;
  channel: string;
  to_address: string;
  subject: string | null;
  body: string | null;
  status: "draft" | "approved" | "sent" | "failed" | "replied";
  provider_ids: unknown;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GtmActivityRow {
  id: string;
  agent_id: string;
  owner_id: string;
  cycle: number;
  step: string;
  tool: string | null;
  subject: string | null;
  outcome: string | null;
  meta: unknown;
  elapsed_ms: number | null;
  created_at: string;
}

function daytona(): Daytona {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) throw new Error("Daytona is not configured.");
  return new Daytona({ apiKey, requestTimeoutMs: 90_000 });
}

export function hasGtm(): boolean {
  return Boolean(process.env.DAYTONA_API_KEY && process.env.DEEPLINE_API_KEY);
}

function cleanLogLine(line: string): string {
  // Daytona frames chunks with control bytes; strip them before parsing.
  return line.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").trim();
}

export function parseGtmLog(raw: string) {
  const events: Array<Record<string, unknown>> = [];
  const leads: Array<Record<string, unknown>> = [];
  const outreach: Array<Record<string, unknown>> = [];
  let done = false;
  let needsAuth: string | null = null;
  let error: string | null = null;

  for (const line of raw.split("\n")) {
    const text = cleanLogLine(line);
    if (!text.startsWith("::gtm-")) continue;
    const colon = text.indexOf(":");
    if (colon === -1) continue;
    const tag = text.slice(6, colon);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(text.slice(colon + 1));
    } catch {
      payload = { raw: text.slice(colon + 1).slice(0, 1000) };
    }

    switch (tag) {
      case "event":
        events.push(payload);
        break;
      case "lead":
        leads.push(payload.lead as Record<string, unknown>);
        break;
      case "outreach":
        outreach.push(payload);
        break;
      case "needs_auth":
        needsAuth = (payload.authUrl as string) || "https://deepline.com/login";
        break;
      case "done":
        done = true;
        break;
      case "error":
        error = String(payload.message || payload);
        break;
    }
  }

  return { events, leads, outreach, done, needsAuth, error };
}

async function uploadConfig(
  sandbox: any,
  state: Record<string, unknown>,
  icp: Record<string, unknown>,
  suppression: { emails: string[]; domains: string[] },
  sendQueue: unknown[],
) {
  await sandbox.process.executeCommand(`mkdir -p ${GTM_DIR}`);
  await sandbox.fs.uploadFile(Buffer.from(JSON.stringify({ ...state, agentId: state.agentId }), "utf8"), `${GTM_DIR}/${GTM_STATE}`);
  await sandbox.fs.uploadFile(Buffer.from(JSON.stringify(icp), "utf8"), `${GTM_DIR}/${GTM_ICP}`);
  await sandbox.fs.uploadFile(Buffer.from(JSON.stringify(suppression), "utf8"), `${GTM_DIR}/${GTM_SUPPRESSION}`);
  await sandbox.fs.uploadFile(Buffer.from(JSON.stringify({ items: sendQueue }), "utf8"), `${GTM_DIR}/${GTM_SEND_QUEUE}`);
  await sandbox.fs.uploadFile(Buffer.from(gtmAgentSource(), "utf8"), `${GTM_DIR}/${GTM_AGENT}`);
}

export async function createGtmSandbox(agentState: GtmAgentRow, approvedDrafts: unknown[] = []): Promise<{ sandboxId: string; sessionId: string; commandId: string }> {
  const client = daytona();
  const sandbox = await client.create(
    {
      name: `agents-wild-gtm-${agentState.agent_id.slice(0, 8)}-${randomUUID().slice(0, 8)}`,
      language: "typescript",
      public: false,
      labels: { app: "agents-in-the-wild", role: "gtm-agent", agent: agentState.agent_id },
      envVars: {
        DEEPLINE_API_KEY: process.env.DEEPLINE_API_KEY || "",
        GTM_SEND_TOOL_ID: process.env.GTM_SEND_TOOL_ID || "lemlist_send_email",
      },
      domainAllowList: `${DEEPLINE_HOSTS},${PARALLEL_HOSTS}`,
      autoStopInterval: 60,
      ttlMinutes: 720,
    },
    { timeout: 90 },
  );

  const sessionId = `gtm-${agentState.agent_id.slice(0, 8)}`;
  await sandbox.process.createSession(sessionId);

  const suppression = { emails: [] as string[], domains: [] as string[] };
  await uploadConfig(
    sandbox,
    { ...agentState.state, agentId: agentState.agent_id, mode: agentState.mode },
    agentState.icp,
    suppression,
    approvedDrafts,
  );

  const cmd = await sandbox.process.executeSessionCommand(sessionId, {
    command: `cd ${GTM_DIR} && npm install -g --no-audit --no-fund --silent deepline@latest && node ${GTM_DIR}/${GTM_AGENT}`,
    runAsync: true,
    suppressInputEcho: true,
  });
  if (!cmd.cmdId) throw new Error("Daytona did not return a GTM command ID.");

  await supabaseResponse(`gtm_agent_state?id=eq.${encodeURIComponent(agentState.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      sandbox_id: sandbox.id,
      session_id: sessionId,
      command_id: cmd.cmdId,
      status: "hunting",
      updated_at: new Date().toISOString(),
    }),
  });

  return { sandboxId: sandbox.id, sessionId, commandId: cmd.cmdId };
}

export async function resumeGtmCycle(
  agentState: GtmAgentRow,
  approvedDrafts: unknown[] = [],
): Promise<{ sandboxId: string; sessionId: string; commandId: string }> {
  if (!agentState.sandbox_id) return createGtmSandbox(agentState, approvedDrafts);

  const client = daytona();
  try {
    const sandbox = await client.get(agentState.sandbox_id);
    const sessionId = agentState.session_id || `gtm-${agentState.agent_id.slice(0, 8)}`;

    await uploadConfig(
      sandbox,
      { ...agentState.state, agentId: agentState.agent_id, mode: agentState.mode },
      agentState.icp,
      { emails: [], domains: [] },
      approvedDrafts,
    );

    const cmd = await sandbox.process.executeSessionCommand(sessionId, {
      command: `cd ${GTM_DIR} && node ${GTM_DIR}/${GTM_AGENT}`,
      runAsync: true,
      suppressInputEcho: true,
    });
    if (!cmd.cmdId) throw new Error("Daytona did not return a GTM command ID.");

    await supabaseResponse(`gtm_agent_state?id=eq.${encodeURIComponent(agentState.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        command_id: cmd.cmdId,
        session_id: sessionId,
        status: "hunting",
        updated_at: new Date().toISOString(),
      }),
    });

    return { sandboxId: sandbox.id, sessionId, commandId: cmd.cmdId };
  } catch {
    // Sandbox gone; recreate.
    return createGtmSandbox(agentState, approvedDrafts);
  }
}

export async function pollAndIngest(agentState: GtmAgentRow): Promise<GtmAgentRow> {
  if (!agentState.sandbox_id || !agentState.session_id || !agentState.command_id) return agentState;

  const client = daytona();
  let raw = "";
  try {
    const sandbox = await client.get(agentState.sandbox_id);
    const logs = await sandbox.process.getSessionCommandLogs(agentState.session_id, agentState.command_id);
    raw = logs?.output ?? [logs?.stdout, logs?.stderr].filter(Boolean).join("\n") ?? "";
  } catch (error) {
    await updateGtmStatus(agentState.id, "error", { error_message: error instanceof Error ? error.message : "poll failed" });
    return { ...agentState, status: "error" };
  }

  const parsed = parseGtmLog(raw);
  const cycle = (agentState.state.cycle as number) || 0;

  for (const e of parsed.events) {
    await supabaseResponse("gtm_activity", {
      method: "POST",
      body: JSON.stringify({
        agent_id: agentState.agent_id,
        owner_id: agentState.owner_id,
        cycle: (e.cycle as number) || cycle,
        step: String(e.step || "tool"),
        tool: e.tool ? String(e.tool) : null,
        subject: e.domain ? String(e.domain) : null,
        outcome: e.status ? String(e.status) : null,
        meta: e,
        elapsed_ms: typeof e.elapsed === "number" ? e.elapsed : null,
      }),
    });
  }

  for (const l of parsed.leads) {
    try {
      await supabaseResponse("gtm_leads", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentState.agent_id,
          owner_id: agentState.owner_id,
          company_name: l.company || l.company_name || null,
          domain: l.domain ? String(l.domain).toLowerCase() : null,
          name: l.name ? String(l.name) : null,
          title: l.title ? String(l.title) : null,
          email: l.email ? String(l.email).toLowerCase() : null,
          linkedin_url: l.linkedin_url ? String(l.linkedin_url) : null,
          verification: l.verified ? { safe: true } : {},
          source_payload: l,
        }),
      });
    } catch {
      // dedupe unique(email) may collide; ignore.
    }
  }

  for (const o of parsed.outreach) {
    // upsert by natural key is hard without id; store each event. Simplest: insert and rely on later reconciliation.
    await supabaseResponse("gtm_outreach", {
      method: "POST",
      body: JSON.stringify({
        agent_id: agentState.agent_id,
        owner_id: agentState.owner_id,
        lead_id: null,
        channel: "email",
        to_address: o.to ? String(o.to) : "",
        subject: o.subject ? String(o.subject) : null,
        body: o.body ? String(o.body) : null,
        status: o.status === "sent" ? "sent" : "draft",
        provider_ids: o.provider_result || {},
        sent_at: o.status === "sent" ? new Date().toISOString() : null,
      }),
    });
  }

  if (parsed.needsAuth) {
    await updateGtmStatus(agentState.id, "error", { error_message: `Deepline needs browser authorization: ${parsed.needsAuth}` });
    return { ...agentState, status: "error" };
  }

  if (parsed.error) {
    await updateGtmStatus(agentState.id, "error", { error_message: parsed.error });
    return { ...agentState, status: "error" };
  }

  if (parsed.done) {
    const nextState = { ...agentState.state, cycle: ((agentState.state.cycle as number) || 0) + 1 };
    await updateGtmStatus(agentState.id, "idle", { state: nextState });
    return { ...agentState, status: "idle", state: nextState };
  }

  return agentState;
}

async function updateGtmStatus(id: string, status: GtmStatus, patch: Record<string, unknown>) {
  await supabaseResponse(`gtm_agent_state?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      ...patch,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function loadGtmAgent(id: string, ownerId: string): Promise<GtmAgentRow | null> {
  const rows = await supabaseJson<GtmAgentRow[]>(
    `gtm_agent_state?select=*&id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
  );
  return rows[0] ?? null;
}

export async function findOwnedGtmAgentByAgentId(agentId: string, ownerId: string): Promise<GtmAgentRow | null> {
  const rows = await supabaseJson<GtmAgentRow[]>(
    `gtm_agent_state?select=*&agent_id=eq.${encodeURIComponent(agentId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
  );
  return rows[0] ?? null;
}

export async function listGtmAgents(ownerId: string): Promise<GtmAgentRow[]> {
  return supabaseJson<GtmAgentRow[]>(
    `gtm_agent_state?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&order=updated_at.desc`,
  );
}

export async function listActiveGtmAgents(): Promise<GtmAgentRow[]> {
  return supabaseJson<GtmAgentRow[]>(
    `gtm_agent_state?select=*&status=in.("hunting","idle")&order=updated_at.desc`,
  );
}

export async function listGtmLeads(agentId: string, ownerId: string, limit = 50): Promise<GtmLeadRow[]> {
  return supabaseJson<GtmLeadRow[]>(
    `gtm_leads?select=*&agent_id=eq.${encodeURIComponent(agentId)}&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc&limit=${limit}`,
  );
}

export async function listGtmOutreach(agentId: string, ownerId: string): Promise<GtmOutreachRow[]> {
  return supabaseJson<GtmOutreachRow[]>(
    `gtm_outreach?select=*&agent_id=eq.${encodeURIComponent(agentId)}&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc`,
  );
}

export async function listGtmActivity(agentId: string, ownerId: string, limit = 100): Promise<GtmActivityRow[]> {
  return supabaseJson<GtmActivityRow[]>(
    `gtm_activity?select=*&agent_id=eq.${encodeURIComponent(agentId)}&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc&limit=${limit}`,
  );
}

export async function setGtmMode(agentId: string, ownerId: string, mode: "draft" | "autosend") {
  await supabaseResponse(
    `gtm_agent_state?agent_id=eq.${encodeURIComponent(agentId)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ mode, updated_at: new Date().toISOString() }),
    },
  );
}

export async function approveOutreach(outreachId: string, ownerId: string): Promise<void> {
  const rows = await supabaseJson<{ agent_id: string }[]>(
    `gtm_outreach?select=agent_id&id=eq.${encodeURIComponent(outreachId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
  );
  if (!rows[0]) throw new Error("Outreach not found.");
  await supabaseResponse(`gtm_outreach?id=eq.${encodeURIComponent(outreachId)}&owner_id=eq.${encodeURIComponent(ownerId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "approved", updated_at: new Date().toISOString() }),
  });
}

export async function collectApprovedOutreach(agentId: string, ownerId: string): Promise<unknown[]> {
  const rows = await supabaseJson<GtmOutreachRow[]>(
    `gtm_outreach?select=*&agent_id=eq.${encodeURIComponent(agentId)}&owner_id=eq.${encodeURIComponent(ownerId)}&status=eq.approved`,
  );
  return rows.map((r) => ({
    to: r.to_address,
    subject: r.subject,
    body: r.body,
    lead: { name: null, email: r.to_address, title: null, company: null },
  }));
}
