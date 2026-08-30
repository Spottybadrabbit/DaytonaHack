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
  const ok = r.code === 0;
  const elapsed = Date.now() - start;
  emit("event", { step: "tool", tool: toolId, ok, elapsed, cycle });
  return { ok, parsed, raw: r.stdout, stderr: r.stderr };
}

async function tryTools(agentId, cycle, list, payload) {
  for (const toolId of list) {
    const out = await tool(agentId, cycle, toolId, payload);
    if (out.ok && !empty(out.parsed)) return { ...out, tool: toolId };
  }
  return null;
}

function empty(v) {
  if (v == null) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (v.results && Array.isArray(v.results) && v.results.length === 0) return true;
  if (v.contacts && Array.isArray(v.contacts) && v.contacts.length === 0) return true;
  return false;
}

function first(arr) { return Array.isArray(arr) ? arr[0] : arr; }

function companyOf(hit) {
  const domain = (hit.domain || hit.company_domain || hit.website_url || "").toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  const name = hit.name || hit.company_name || hit.company || domain;
  return { name, domain };
}

function peopleOf(parsed) {
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed.results || parsed.contacts || parsed.people || parsed.data || []);
  return arr.map((p) => {
    const person = p.person || p;
    const email = (person.email || p.email || "").toLowerCase();
    const name = person.name || person.full_name || ((person.first_name || "") + " " + (person.last_name || "")).trim() || null;
    const title = person.title || person.job_title || person.role || p.title || null;
    return { name, title, email: email || null, linkedin_url: person.linkedin_url || p.linkedin_url || null, raw: p };
  }).filter((p) => p.email || p.linkedin_url);
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

  const search = await tryTools(agentId, cycle, icp.search_tools || ["apollo_search_people"], {
    query: icp.query || icp.industry || "startups",
    industry: icp.industry,
    location: icp.location,
    employee_count: icp.employee_count,
    limit: Math.min(icp.limit || 10, 25),
  });

  if (!search) {
    emit("event", { step: "no_search_results", cycle });
    return { ...state, cycle, last_cycle_at: now };
  }

  const hits = Array.isArray(search.parsed) ? search.parsed : (search.parsed.results || search.parsed.companies || search.parsed.people || []);
  emit("event", { step: "search_results", cycle, count: hits.length, tool: search.tool });

  const queue = hits.slice(0, icp.max_companies_per_cycle || 3);
  let newLeads = 0;

  for (const hit of queue) {
    const company = companyOf(hit);
    if (!company.domain || suppression.domains?.includes(company.domain)) {
      emit("event", { step: "skip_company", cycle, domain: company.domain });
      continue;
    }

    const enrich = await tool(agentId, cycle, "company_enrich", { domain: company.domain, company_name: company.name });
    if (enrich.ok) emit("event", { step: "company_enriched", cycle, domain: company.domain });

    const contacts = await tryTools(agentId, cycle, icp.contact_tools || ["company_to_contact_by_role_waterfall", "apollo_search_people"], {
      domain: company.domain,
      company_name: company.name,
      roles: icp.roles || ["Head of Growth", "VP Sales", "Founder"],
      limit: icp.contacts_per_company || 2,
    });

    if (!contacts) {
      emit("event", { step: "no_contacts", cycle, domain: company.domain });
      continue;
    }

    const people = peopleOf(contacts.parsed);
    emit("event", { step: "contacts", cycle, domain: company.domain, count: people.length });

    for (const p of people) {
      if (p.email && suppression.emails?.includes(p.email)) continue;
      if (p.email) {
        const v = await tool(agentId, cycle, "email_verify", { email: p.email });
        if (!v.ok || v.parsed?.safe === false) continue;
        p.verified = true;
      }

      const lead = { ...p, company_name: company.name, domain: company.domain, created_at: now, source_tool: contacts.tool, cycle };
      await appendJsonl(join(DIR, "leads.jsonl"), lead);
      emit("lead", { cycle, lead: { name: lead.name, email: lead.email, company: lead.company_name, title: lead.title } });
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
        if (sent.ok && sent.ok) state.daily_sent = (state.daily_sent || 0) + 1;
      } else {
        await appendJsonl(join(DIR, "outreach.jsonl"), draft);
        emit("outreach", { cycle, status: "draft", to: draft.to });
      }

      if (newLeads >= LEAD_CAP) break;
    }
    if (newLeads >= LEAD_CAP) break;
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
  emit("outreach", { cycle, status: out.status, to: draft.to, tool: toolId });
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
