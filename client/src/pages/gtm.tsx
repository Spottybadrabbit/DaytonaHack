import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { ArrowLeft, Loader2, Play, Send, ShieldCheck, XCircle } from "lucide-react";
import { Eyebrow } from "@/pages/site/eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  EXPORT_BUTTON_CLASS,
  downloadText,
  slugify,
  toCsv,
  toMarkdownTable,
  type ExportColumn,
} from "@/lib/export";
import { apiRequest } from "@/lib/queryClient";
import { approveOutreach, getGtmAgent, huntGtm, listGtmAgents, tameGtmAgent, type GtmActivity, type GtmAgent, type GtmLead, type GtmOutreach } from "@/lib/gtm";

const LEAD_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "created_at", label: "Created at" },
  { key: "company_name", label: "Company name" },
  { key: "domain", label: "Domain" },
  { key: "name", label: "Name" },
  { key: "title", label: "Title" },
  { key: "email", label: "Email" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "verification_status", label: "Verification status" },
];

const OUTBOX_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "created_at", label: "Created at" },
  { key: "status", label: "Status" },
  { key: "channel", label: "Channel" },
  { key: "to_address", label: "To" },
  { key: "subject", label: "Subject" },
  { key: "body", label: "Body" },
  { key: "sent_at", label: "Sent at" },
];

function verificationStatus(value: unknown): string {
  if (!value || typeof value !== "object") return value == null ? "" : String(value);
  const record = value as Record<string, unknown>;
  return String(record.status ?? record.safe ?? "");
}

function GtmExportControls({
  filenameBase,
  columns,
  rows,
}: {
  filenameBase: string;
  columns: ExportColumn[];
  rows: Array<Record<string, unknown>>;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={EXPORT_BUTTON_CLASS}
        onClick={() => downloadText(`${filenameBase}.csv`, "text/csv;charset=utf-8", toCsv(columns, rows))}
      >
        CSV
      </button>
      <button
        type="button"
        className={EXPORT_BUTTON_CLASS}
        onClick={() => downloadText(`${filenameBase}.md`, "text/markdown;charset=utf-8", toMarkdownTable(columns, rows))}
      >
        MD
      </button>
    </div>
  );
}

export default function GtmPage() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState<string>("");
  const [agents, setAgents] = useState<GtmAgent[]>([]);
  const [selected, setSelected] = useState<GtmAgent | null>(null);
  const [leads, setLeads] = useState<GtmLead[]>([]);
  const [outreach, setOutreach] = useState<GtmOutreach[]>([]);
  const [activity, setActivity] = useState<GtmActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState("Head of Growth, VP Sales, Founder");
  const [template, setTemplate] = useState("Hi {{first}}, I saw {{company}} is building something interesting — any appetite for a quick call next week?");
  const [mode, setMode] = useState<"draft" | "autosend">("draft");

  useEffect(() => {
    if (!isSignedIn) return;
    void getToken().then((t) => setToken(t || ""));
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!token) return;
    loadList();
  }, [token]);

  async function loadList() {
    try {
      const res = await listGtmAgents(token);
      setAgents(res.agents);
    } catch (e) {
      toast({ title: "Could not load GTM agents", description: String(e), variant: "destructive" });
    }
  }

  async function openAgent(agent: GtmAgent) {
    setSelected(agent);
    setLoading(true);
    try {
      const res = await getGtmAgent(agent.agent_id, token);
      setLeads(res.leads);
      setOutreach(res.outreach);
      setActivity(res.activity);
    } catch (e) {
      toast({ title: "Could not load agent", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleTame(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !query) return;
    try {
      await tameGtmAgent(name, {
        query,
        roles: roles.split(",").map((r) => r.trim()).filter(Boolean),
        template,
      }, mode, token);
      toast({ title: "GTM agent tamed", description: "It will begin hunting on the next tick." });
      setName("");
      setQuery("");
      await loadList();
    } catch (e) {
      toast({ title: "Tame failed", description: String(e), variant: "destructive" });
    }
  }

  async function handleHunt() {
    if (!selected) return;
    try {
      await huntGtm(selected.agent_id, token);
      toast({ title: "Hunt started", description: "The agent is out in its sandbox." });
      await openAgent(selected);
    } catch (e) {
      toast({ title: "Hunt failed", description: String(e), variant: "destructive" });
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveOutreach(id, token);
      toast({ title: "Approved", description: "The agent will send this on its next cycle." });
      if (selected) await openAgent(selected);
    } catch (e) {
      toast({ title: "Approval failed", description: String(e), variant: "destructive" });
    }
  }

  if (selected) {
    const agentName = selected.name || selected.icp.query || "agent";
    const leadRows = leads.map((lead) => ({
      created_at: lead.created_at,
      company_name: lead.company_name,
      domain: lead.domain,
      name: lead.name,
      title: lead.title,
      email: lead.email,
      linkedin_url: lead.linkedin_url,
      verification_status: verificationStatus(lead.verification),
    }));
    const outboxRows = outreach.map((item) => ({
      created_at: item.created_at,
      status: item.status,
      channel: item.channel,
      to_address: item.to_address,
      subject: item.subject,
      body: item.body,
      sent_at: item.sent_at,
    }));
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
          <button onClick={() => setSelected(null)} className="text-xs font-mono uppercase tracking-widest mb-8 flex items-center gap-2 hover:text-foreground/70">
            <ArrowLeft className="w-4 h-4" /> Back to GTM den
          </button>
          <Eyebrow>Sandboxed agent</Eyebrow>
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mt-2">
            <div className="flex-1">
              <h1 className="font-display text-4xl lg:text-6xl mb-4">{selected.icp.query || "Untitled agent"}</h1>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Status: <span className="font-mono text-xs uppercase tracking-widest">{selected.status}</span>
                <span className="mx-3 text-foreground/20">|</span>
                Mode: <span className="font-mono text-xs uppercase tracking-widest">{selected.mode}</span>
              </p>
              <Button onClick={handleHunt} disabled={selected.status === "hunting"} className="bg-foreground text-background hover:bg-foreground/90 rounded-none mb-12">
                {selected.status === "hunting" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {selected.status === "hunting" ? "Hunting" : "Run a hunt cycle"}
              </Button>

              <h2 className="font-display text-2xl mb-4">Field notes</h2>
              <div className="border border-foreground/10 bg-foreground/[0.02] p-4 h-96 overflow-auto">
                {activity.length === 0 && <p className="text-muted-foreground text-sm">No activity yet.</p>}
                {activity.map((a) => (
                  <div key={a.id} className="border-b border-foreground/5 py-2 text-sm">
                    <span className="font-mono text-xs uppercase text-muted-foreground">{a.created_at.slice(11, 16)}</span>
                    <span className="mx-2 font-mono text-xs text-[#eca8d6]">cycle {a.cycle}</span>
                    <span className="font-mono text-xs uppercase">{a.step}</span>
                    {a.tool && <span className="text-muted-foreground ml-2 text-xs">{a.tool}</span>}
                    {a.outcome && <span className="text-muted-foreground block text-xs">{a.outcome}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-[420px] space-y-8">
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl">Verified leads</h2>
                  <GtmExportControls
                    filenameBase={`gtm-${slugify(agentName)}-leads`}
                    columns={LEAD_EXPORT_COLUMNS}
                    rows={leadRows}
                  />
                </div>
                <div className="border border-foreground/10 bg-foreground/[0.02] max-h-64 overflow-auto">
                  {leads.length === 0 && <p className="p-4 text-muted-foreground text-sm">No leads yet.</p>}
                  {leads.map((l) => (
                    <div key={l.id} className="border-b border-foreground/5 p-3 text-sm">
                      <div className="font-medium">{l.name || "Unknown"} <span className="text-muted-foreground">{l.title}</span></div>
                      <div className="text-muted-foreground text-xs">{l.company_name}</div>
                      <div className="font-mono text-xs">{l.email}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl">Outbox</h2>
                  <GtmExportControls
                    filenameBase={`gtm-${slugify(agentName)}-outbox`}
                    columns={OUTBOX_EXPORT_COLUMNS}
                    rows={outboxRows}
                  />
                </div>
                <div className="max-h-80 overflow-auto border border-foreground/10 bg-foreground/[0.02]">
                  {outreach.length === 0 && <p className="p-4 text-muted-foreground text-sm">Nothing queued.</p>}
                  {outreach.map((o) => (
                    <div key={o.id} className="border-b border-foreground/5 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{o.to_address}</span>
                        <span className="font-mono text-xs uppercase">{o.status}</span>
                      </div>
                      <div className="text-muted-foreground text-xs truncate">{o.subject}</div>
                      {o.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleApprove(o.id)} className="mt-2 rounded-none border-foreground/20 hover:bg-foreground/5">
                          <ShieldCheck className="w-3 h-3 mr-2" /> Approve send
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
        <Eyebrow>GTM agents</Eyebrow>
        <h1 className="font-display text-4xl lg:text-6xl mb-6">Tame a <span className="text-[#eca8d6]">lead hunter</span></h1>
        <p className="text-muted-foreground max-w-2xl mb-12">
          Create a GTM agent that lives in its own Daytona sandbox. It sources leads with DeepLine,
          verifies emails, drafts outreach, and sends only when you approve — then it comes back and tells you what it found.
        </p>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          <form onSubmit={handleTame} className="space-y-6 border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-8">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Agent name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="UK deeptech hunters" className="rounded-none bg-transparent border-foreground/20 mt-2" />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Target query / ICP</label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="UK Physical AI startups, 10-50 people" className="rounded-none bg-transparent border-foreground/20 mt-2" />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Roles</label>
              <Input value={roles} onChange={(e) => setRoles(e.target.value)} className="rounded-none bg-transparent border-foreground/20 mt-2" />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Template</label>
              <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={3} className="rounded-none bg-transparent border-foreground/20 mt-2" />
            </div>
            <div className="flex items-center gap-4">
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as "draft" | "autosend")} className="bg-transparent border border-foreground/20 text-sm p-2">
                <option value="draft">Draft-only (I approve every send)</option>
                <option value="autosend">Autosend up to daily cap</option>
              </select>
            </div>
            <Button type="submit" className="bg-foreground text-background hover:bg-foreground/90 rounded-none w-full">
              Tame GTM agent
            </Button>
          </form>

          <div>
            <h2 className="font-display text-2xl mb-6">Your agents</h2>
            {agents.length === 0 && <p className="text-muted-foreground">No GTM agents yet.</p>}
            <div className="space-y-3">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openAgent(a)}
                  className="w-full text-left border border-foreground/10 hover:border-foreground/30 bg-foreground/[0.02] p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl">{a.icp.query || "Untitled"}</span>
                    <span className={`font-mono text-xs uppercase ${a.status === "hunting" ? "text-[#eca8d6]" : "text-muted-foreground"}`}>{a.status}</span>
                  </div>
                  <div className="text-muted-foreground text-xs mt-1 font-mono uppercase tracking-widest">{a.mode}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
