/**
 * Source for the GTM agent runner uploaded into a Daytona sandbox.
 * It runs one hunt cycle (source -> enrich -> contact -> verify -> draft/send),
 * writes structured result files, and exits. Vercel cron restarts it.
 *
 * Invariants: all deepline calls use execFile with an argv array; user data is
 * never interpolated into a shell string. The DEEPLINE_API_KEY is consumed by
 * the CLI env var, never logged.
 */

export const GTM_DIR = "/home/daytona/.agents-wild-gtm";
export const GTM_AGENT = "gtm-agent.mjs";
export const GTM_STATE = "state.json";
export const GTM_ICP = "icp.json";
export const GTM_SUPPRESSION = "suppression.json";
export const GTM_SEND_QUEUE = "send-approved.json";

export function gtmAgentSource() {
  return String.raw`import { execFile } from "node:child_process";
import { readFile, writeFile, appendFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const DIR = "/home/daytona/.agents-wild-gtm";
const F = {
  state: join(DIR, "state.json"),
  icp: join(DIR, "icp.json"),
  suppression: join(DIR, "suppression.json"),
  sendQueue: join(DIR, "send-approved.json"),
};

const DEEPLINE_TIMEOUT = 240_000;
const MAX_BUFFER = 8 * 1024 * 1024;
const LEAD_CAP = 50;

async function exist(p) { try { await readFile(p, "utf8"); return true; } catch { return false; } }
async function readJson(p, fallback = {}) { try { return JSON.parse(await readFile(p, "utf8")); } catch { return fallback; } }
async function writeJson(p, v) { await mkdir(DIR, { recursive: true }); await writeFile(p, JSON.stringify(v, null, 2) + "\n"); }
async function appendJsonl(p, v) { await mkdir(DIR, { recursive: true }); await appendFile(p, JSON.stringify(v) + "\n"); }

function emit(tag, data = {}) { console.log("::gtm-" + tag + ":" + JSON.stringify(data)); }

function run(argv) {
  return new Promise((resolve) => {
    execFile("deepline", argv, { timeout: DEEPLINE_TIMEOUT, maxBuffer: MAX_BUFFER, cwd: DIR }, (error, stdout, stderr) => {
      const code = error && typeof error.code === "number" ? error.code : error ? 1 : 0;
      resolve({ code, stdout, stderr });
    });
  });
}

async function authOk() {
  const r = await run(["auth", "status"]);
  return r.code === 0 && !/not\s+(logged|authori)/i.test(r.stdout + r.stderr);
}

async function auth(agentId) {
  if (await authOk()) return true;
  emit("event", { step: "auth", status: "attempting" });
  // If the CLI already reads DEEPLINE_API_KEY, status should now pass. If not,
  // try an explicit register call (best-effort: the CLI may change this shape).
  if (process.env.DEEPLINE_API_KEY) {
    await run(["auth", "register", "--api-key", process.env.DEEPLINE_API_KEY, "--json"]);
  }
  if (await authOk()) return true;
  const setup = await run(["setup", "--json"]);
  const combined = setup.stdout + "\n" + setup.stderr;
  const url = (combined.match(/https:\/\/[^\s"']*(?:auth|login|approve|verify)[^\s"']*/i) || [])[0];
  emit("needs_auth", { authUrl: url || "https://deepline.com/login" });
  return false;
}

async function tool(agentId, cycle, toolId, payload) {
  const start = Date.now();
  const r = await run(["tools", "execute", toolId, "--payload", JSON.stringify(payload)]);
  let parsed;
  try { parsed = JSON.parse(r.stdout); } catch { parsed = { raw: r.stdout.slice(0, 8000) }; }
  const body = parsed?.toolResponse?.rawV2 ?? parsed?.toolResponse?.raw ?? parsed;
  const reportedStatus = parsed?.status ?? body?.status;
  const stdoutError = r.stdout.trimStart().startsWith("Error:");
  const failedStatus = reportedStatus === "failed" || reportedStatus === "FAILED";
  const ok = r.code === 0 && !stdoutError && !failedStatus;
  const elapsed = Date.now() - start;
  const rawErrorText = (stdoutError ? r.stdout : r.stderr).trim();
  const errorText = (process.env.DEEPLINE_API_KEY
    ? rawErrorText.replace(process.env.DEEPLINE_API_KEY, "[redacted]")
    : rawErrorText).slice(0, 200);
  emit("event", {
    step: "tool",
    tool: toolId,
    ok,
    elapsed,
    cycle,
    ...(ok ? {} : { error: errorText || "tool failed" }),
  });
  return { ok, parsed, body, raw: r.stdout, stderr: r.stderr };
}

async function tryTools(agentId, cycle, list, ctx) {
  for (const toolId of list) {
    const out = await tool(agentId, cycle, toolId, payloadFor(toolId, ctx));
    if (out.ok && !empty(out.body)) return { ...out, tool: toolId };
  }
  return null;
}

function payloadFor(toolId, ctx) {
  switch (toolId) {
    case "exa_people_search":
      return { query: ctx.query, numResults: ctx.numResults, type: "auto" };
    case "enrich_contact":
      return Object.fromEntries(
        Object.entries({
          linkedin: ctx.linkedin_url,
          full_name: ctx.name,
          domain: ctx.domain,
        }).filter(([, value]) => value != null),
      );
    case "hunter_email_verifier":
      return { email: ctx.email };
    default:
      return ctx;
  }
}

function empty(v) {
  if (v == null) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (v.results && Array.isArray(v.results) && v.results.length === 0) return true;
  if (v.contacts && Array.isArray(v.contacts) && v.contacts.length === 0) return true;
  return false;
}

function draftBody(lead, icp) {
  const first = (lead.name || "there").split(" ")[0] || "there";
  const company = lead.company_name || lead.domain;
  const tpl = icp.template || "Hi {{first}}, I saw {{company}} is building something interesting — any appetite for a quick call next week?";
  return tpl
    .replace(/\{\{first\}\}/g, first)
    .replace(/\{\{name\}\}/g, lead.name || "there")
    .replace(/\{\{company\}\}/g, company)
    .replace(/\{\{title\}\}/g, lead.title || "");
}

async function runCycle(agentId, state, icp, suppression) {
  const cycle = (state.cycle || 0) + 1;
  const now = new Date().toISOString();
  emit("event", { step: "cycle_start", cycle });

  const today = now.slice(0, 10);
  if (state.daily_reset_date !== today) {
    state.daily_reset_date = today;
    state.daily_sent = 0;
  }

  const query = [
    icp.query || icp.industry || "startups",
    (icp.roles || []).join(" or "),
    icp.location,
  ].filter(Boolean).join(", ");
  const search = await tryTools(agentId, cycle, icp.search_tools || ["exa_people_search"], {
    query,
    numResults: Math.min(icp.limit || 10, 25),
    type: "auto",
  });

  if (!search) {
    emit("event", { step: "no_search_results", cycle });
    return { ...state, cycle, last_cycle_at: now };
  }

  const hits = Array.isArray(search.body?.results) ? search.body.results : [];
  emit("event", { step: "search_results", cycle, count: hits.length, tool: search.tool });

  const maxLeads = icp.max_leads_per_cycle || 3;
  let newLeads = 0;

  for (const item of hits) {
    if (newLeads >= maxLeads || newLeads >= LEAD_CAP) break;
    const props = item.entities?.[0]?.properties || {};
    const workHistory = Array.isArray(props.workHistory) ? props.workHistory : [];
    const current = workHistory.find((w) => !w?.dates?.to) || workHistory[0];
    const candidate = {
      name: props.name || item.title || null,
      linkedin_url: item.url?.includes("linkedin.com") ? item.url : null,
      title: current?.title || null,
      company_name: current?.company?.name || null,
      domain: current?.company?.domain || props.company_domain || null,
    };
    if (!candidate.linkedin_url && !candidate.name) continue;

    const enrich = await tryTools(agentId, cycle, icp.contact_tools || ["enrich_contact"], candidate);
    const person = enrich?.body?.output?.person || {};
    const email = (person.professional_email || person.personal_email || "").toLowerCase() || null;
    const name = person.full_name
      || candidate.name
      || [person.first_name, person.last_name].filter(Boolean).join(" ")
      || null;
    if (!email) {
      emit("event", { step: "no_email", cycle, name });
      continue;
    }

    const domain = person.company_domain || candidate.domain || null;
    if (suppression.emails?.includes(email) || (domain && suppression.domains?.includes(domain))) {
      continue;
    }

    const verify = await tryTools(agentId, cycle, icp.verify_tools || ["hunter_email_verifier"], { email });
    const v = verify?.body?.data || {};
    const accepted = verify
      ? v.status === "valid"
        || (v.status === "accept_all" && (v.score ?? 0) >= 70)
      : person.email_verified === true;
    if (!accepted) {
      emit("event", { step: "email_rejected", cycle, outcome: v.status || "unverified" });
      continue;
    }

    const verification = {
      status: v.status || (person.email_verified ? "provider_verified" : "unverified"),
      score: v.score ?? null,
      source: "hunter_email_verifier",
    };
    const lead = {
      name,
      title: person.title || candidate.title || null,
      email,
      linkedin_url: person.linkedin_url || candidate.linkedin_url || null,
      company_name: person.company_name || candidate.company_name || null,
      domain,
      seniority: person.seniority || null,
      verification,
      created_at: now,
      source_tool: enrich.tool,
      cycle,
    };
    await appendJsonl(join(DIR, "leads.jsonl"), lead);
    emit("lead", {
      cycle,
      lead: {
        name: lead.name,
        title: lead.title,
        email: lead.email,
        linkedin_url: lead.linkedin_url,
        company_name: lead.company_name,
        domain: lead.domain,
        verification: lead.verification,
        seniority: lead.seniority,
      },
    });
    newLeads += 1;

    const draft = {
      to: lead.email,
      subject: icp.subject || ("Quick note for " + (lead.company_name || lead.domain)),
      body: draftBody(lead, icp),
      lead: { name: lead.name, email: lead.email, title: lead.title, company: lead.company_name },
      status: "draft",
      cycle,
      created_at: now,
    };

    if (state.mode === "autosend" && (state.daily_sent || 0) < (icp.daily_email_cap || 10)) {
      const sent = await sendOne(agentId, cycle, draft, icp);
      if (sent.ok) state.daily_sent = (state.daily_sent || 0) + 1;
    } else {
      await appendJsonl(join(DIR, "outreach.jsonl"), draft);
      emit("outreach", {
        cycle,
        status: "draft",
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
        tool: null,
      });
    }
  }

  // Send anything the user explicitly approved between cycles.
  const sendQueue = await readJson(F.sendQueue, { items: [] });
  for (const draft of sendQueue.items || []) {
    await sendOne(agentId, cycle, draft, icp);
  }
  await writeJson(F.sendQueue, { items: [] });

  emit("event", { step: "cycle_end", cycle, newLeads });
  return { ...state, cycle, last_cycle_at: now, daily_sent: state.daily_sent, daily_reset_date: state.daily_reset_date };
}

async function sendOne(agentId, cycle, draft, icp) {
  const toolId = process.env.GTM_SEND_TOOL_ID || icp.send_tool || "lemlist_send_email";
  const r = await tool(agentId, cycle, toolId, { to: draft.to, subject: draft.subject, body: draft.body, ...draft.lead });
  const out = { ...draft, status: r.ok ? "sent" : "failed", provider_result: r.parsed, sent_at: r.ok ? new Date().toISOString() : undefined };
  await appendJsonl(join(DIR, "outreach.jsonl"), out);
  emit("outreach", {
    cycle,
    status: out.status,
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
    tool: toolId,
  });
  return r;
}

async function main() {
  await mkdir(DIR, { recursive: true });
  const state = await readJson(F.state, { cycle: 0 });
  const icp = await readJson(F.icp, {});
  const suppression = await readJson(F.suppression, { emails: [], domains: [] });

  if (!state.agentId) throw new Error("Missing state.agentId");

  if (!(await auth(state.agentId))) {
    emit("done", { cycle: state.cycle, reason: "needs_auth" });
    process.exit(0);
  }

  const next = await runCycle(state.agentId, state, icp, suppression);
  await writeJson(F.state, next);
  emit("done", { cycle: next.cycle, reason: "cycle_complete" });
}

main().catch((e) => {
  emit("error", { message: e?.message || String(e) });
  process.exit(1);
});
`;
}
