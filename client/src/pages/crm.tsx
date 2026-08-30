import { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { Eyebrow } from "@/pages/site/eyebrow";
import {
  EXPORT_BUTTON_CLASS,
  downloadText,
  toCsv,
  toMarkdownTable,
  type ExportColumn,
} from "@/lib/export";
import {
  getGtmAgent,
  listGtmAgents,
  type GtmAgent,
  type GtmLead,
  type GtmOutreach,
} from "@/lib/gtm";

type VerificationRecord = {
  status?: string;
  score?: number | null;
  source?: string | null;
  safe?: boolean;
};

type CrmLead = GtmLead & {
  strategyId: string;
  strategyName: string;
};

type CrmOutreach = GtmOutreach & {
  strategyId: string;
  strategyName: string;
};

const OUTREACH_STATUSES: GtmOutreach["status"][] = [
  "draft",
  "approved",
  "sent",
  "failed",
  "replied",
];

const LEAD_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "created_at", label: "Created at" },
  { key: "strategy", label: "Strategy" },
  { key: "company_name", label: "Company name" },
  { key: "domain", label: "Domain" },
  { key: "name", label: "Name" },
  { key: "title", label: "Title" },
  { key: "email", label: "Email" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "verification_status", label: "Verification status" },
  { key: "last_outreach_status", label: "Last outreach status" },
];

function verificationFor(lead: GtmLead): VerificationRecord {
  if (!lead.verification || typeof lead.verification !== "object") return {};
  return lead.verification as VerificationRecord;
}

function isVerified(lead: GtmLead): boolean {
  const verification = verificationFor(lead);
  return verification.status === "valid"
    || verification.status === "accept_all"
    || verification.safe === true;
}

function verificationLabel(lead: GtmLead): string {
  const verification = verificationFor(lead);
  if (isVerified(lead)) return verification.status || "verified";
  return verification.status || "unverified";
}

function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function searchText(lead: CrmLead): string {
  return [
    lead.name,
    lead.email,
    lead.company_name,
    lead.domain,
    lead.title,
  ].filter(Boolean).join(" ").toLowerCase();
}

function outreachForLead(lead: CrmLead, outreach: CrmOutreach[]): CrmOutreach[] {
  return outreach
    .filter((item) =>
      (item.lead_id && item.lead_id === lead.id)
      || (Boolean(lead.email) && item.to_address.toLowerCase() === lead.email?.toLowerCase()),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-foreground/10 bg-foreground/[0.02] px-6 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{children}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-foreground/10 bg-foreground/[0.02] p-4 min-h-24">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-4xl mt-2">{value}</div>
    </div>
  );
}

export default function Crm() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [strategies, setStrategies] = useState<GtmAgent[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [outreach, setOutreach] = useState<CrmOutreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [outreachFilter, setOutreachFilter] = useState("all");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token unavailable.");
        const listed = await listGtmAgents(token);
        const details = await Promise.all(
          listed.agents.map(async (agent) => ({
            agent,
            detail: await getGtmAgent(agent.agent_id, token),
          })),
        );
        if (cancelled) return;

        const taggedLeads: CrmLead[] = [];
        const taggedOutreach: CrmOutreach[] = [];
        for (const { agent, detail } of details) {
          const strategyName = agent.name || "Untitled strategy";
          taggedLeads.push(
            ...detail.leads.map((lead) => ({
              ...lead,
              strategyId: agent.agent_id,
              strategyName,
            })),
          );
          taggedOutreach.push(
            ...detail.outreach.map((item) => ({
              ...item,
              strategyId: agent.agent_id,
              strategyName,
            })),
          );
        }
        setStrategies(listed.agents);
        setLeads(taggedLeads);
        setOutreach(taggedOutreach);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load CRM data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  const outreachByLead = useMemo(() => {
    const map = new Map<string, CrmOutreach[]>();
    for (const lead of leads) map.set(`${lead.strategyId}:${lead.id}`, outreachForLead(lead, outreach));
    return map;
  }, [leads, outreach]);

  const filteredLeads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return leads
      .filter((lead) => !needle || searchText(lead).includes(needle))
      .filter((lead) => strategyFilter === "all" || lead.strategyName === strategyFilter)
      .filter((lead) => verificationFilter === "all"
        || (verificationFilter === "verified" ? isVerified(lead) : !isVerified(lead)))
      .filter((lead) => {
        if (outreachFilter === "all") return true;
        return (outreachByLead.get(`${lead.strategyId}:${lead.id}`) || [])
          .some((item) => item.status === outreachFilter);
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [leads, outreachByLead, outreachFilter, search, strategyFilter, verificationFilter]);

  const filteredExportRows = useMemo(
    () => filteredLeads.map((lead) => {
      const related = outreachByLead.get(`${lead.strategyId}:${lead.id}`) || [];
      return {
        created_at: lead.created_at,
        strategy: lead.strategyName,
        company_name: lead.company_name,
        domain: lead.domain,
        name: lead.name,
        title: lead.title,
        email: lead.email,
        linkedin_url: lead.linkedin_url,
        verification_status: verificationLabel(lead),
        last_outreach_status: related[0]?.status || "",
      };
    }),
    [filteredLeads, outreachByLead],
  );

  const kpis = useMemo(() => {
    const companies = new Set(
      leads
        .map((lead) => (lead.domain || lead.company_name || "").trim().toLowerCase())
        .filter(Boolean),
    );
    return {
      totalLeads: leads.length,
      verifiedLeads: leads.filter(isVerified).length,
      companies: companies.size,
      drafts: outreach.filter((item) => item.status === "draft").length,
      sent: outreach.filter((item) => item.status === "sent").length,
      replied: outreach.filter((item) => item.status === "replied").length,
    };
  }, [leads, outreach]);

  if (!isLoaded || loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-32">
        <EmptyPanel>Loading CRM pipeline</EmptyPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-32">
        <Eyebrow>CRM</Eyebrow>
        <h1 className="font-display text-4xl lg:text-6xl mb-6">Pipeline error</h1>
        <div className="border border-foreground/10 bg-foreground/[0.02] p-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {error}
        </div>
      </div>
    );
  }

  const hasData = strategies.length > 0 && leads.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
        <Eyebrow>CRM pipeline</Eyebrow>
        <h1 className="font-display text-4xl lg:text-6xl mb-4">The GTM desk</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-10">
          {strategies.length} strategies · {leads.length} leads · {outreach.length} outreach records
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-foreground/10 mb-12">
          <Kpi label="Total leads" value={kpis.totalLeads} />
          <Kpi label="Verified leads" value={kpis.verifiedLeads} />
          <Kpi label="Distinct companies" value={kpis.companies} />
          <Kpi label="Drafts awaiting approval" value={kpis.drafts} />
          <Kpi label="Sent" value={kpis.sent} />
          <Kpi label="Replied" value={kpis.replied} />
        </div>

        {!hasData ? (
          <EmptyPanel>
            {strategies.length === 0 ? "No GTM strategies yet" : "No leads across your GTM strategies yet"}
          </EmptyPanel>
        ) : (
          <>
            <div className="border border-foreground/10 bg-foreground/[0.02] p-4 mb-8 grid lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, company, domain, title"
                aria-label="Search leads"
                className="w-full bg-transparent border border-foreground/20 px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <select
                value={strategyFilter}
                onChange={(event) => setStrategyFilter(event.target.value)}
                aria-label="Filter by strategy"
                className="bg-transparent border border-foreground/20 px-3 py-2 text-sm"
              >
                <option value="all">All strategies</option>
                {strategies.map((strategy) => (
                  <option key={strategy.agent_id} value={strategy.name || "Untitled strategy"}>
                    {strategy.name || "Untitled strategy"}
                  </option>
                ))}
              </select>
              <select
                value={verificationFilter}
                onChange={(event) => setVerificationFilter(event.target.value)}
                aria-label="Filter by verification"
                className="bg-transparent border border-foreground/20 px-3 py-2 text-sm"
              >
                <option value="all">All verification</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
              <select
                value={outreachFilter}
                onChange={(event) => setOutreachFilter(event.target.value)}
                aria-label="Filter by outreach status"
                className="bg-transparent border border-foreground/20 px-3 py-2 text-sm"
              >
                <option value="all">All outreach status</option>
                {OUTREACH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-2xl">Leads</h2>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-1">
                  {filteredLeads.length} matching records
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={EXPORT_BUTTON_CLASS}
                  disabled={filteredExportRows.length === 0}
                  onClick={() => downloadText("crm-leads.csv", "text/csv;charset=utf-8", toCsv(LEAD_EXPORT_COLUMNS, filteredExportRows))}
                >
                  CSV
                </button>
                <button
                  type="button"
                  className={EXPORT_BUTTON_CLASS}
                  disabled={filteredExportRows.length === 0}
                  onClick={() => downloadText("crm-leads.md", "text/markdown;charset=utf-8", toMarkdownTable(LEAD_EXPORT_COLUMNS, filteredExportRows))}
                >
                  MD
                </button>
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <EmptyPanel>No leads match these filters</EmptyPanel>
            ) : (
              <div className="overflow-x-auto border border-foreground/10">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-foreground/10 bg-foreground/[0.02]">
                    <tr className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      <th className="p-3 font-normal">Company</th>
                      <th className="p-3 font-normal">Contact</th>
                      <th className="p-3 font-normal">Email</th>
                      <th className="p-3 font-normal">Strategy</th>
                      <th className="p-3 font-normal">Verification</th>
                      <th className="p-3 font-normal">Last outreach</th>
                      <th className="p-3 font-normal">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const key = `${lead.strategyId}:${lead.id}`;
                      const related = outreachByLead.get(key) || [];
                      const lastOutreach = related[0];
                      const expanded = expandedLead === key;
                      const verification = verificationFor(lead);
                      return (
                        <Fragment key={key}>
                          <tr
                            onClick={() => setExpandedLead(expanded ? null : key)}
                            className="border-b border-foreground/10 hover:bg-foreground/[0.03] cursor-pointer align-top"
                          >
                            <td className="p-3">
                              <div>{lead.company_name || "—"}</div>
                              <div className="font-mono text-xs text-muted-foreground">{lead.domain || "—"}</div>
                            </td>
                            <td className="p-3">
                              <div>{lead.name || "Unknown"}</div>
                              <div className="text-muted-foreground">{lead.title || "—"}</div>
                            </td>
                            <td className="p-3 font-mono text-xs">{lead.email || "—"}</td>
                            <td className="p-3 text-muted-foreground">{lead.strategyName}</td>
                            <td className={`p-3 font-mono text-xs uppercase ${isVerified(lead) ? "text-[#eca8d6]" : "text-muted-foreground"}`}>
                              {verificationLabel(lead)}
                            </td>
                            <td className="p-3">
                              {lastOutreach ? (
                                <>
                                  <div className="font-mono text-xs uppercase">{lastOutreach.status}</div>
                                  <div className="text-muted-foreground text-xs">{shortDate(lastOutreach.created_at)}</div>
                                </>
                              ) : "—"}
                            </td>
                            <td className="p-3 text-muted-foreground">{shortDate(lead.created_at)}</td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                              <td colSpan={7} className="p-5">
                                <div className="grid md:grid-cols-2 gap-8">
                                  <div>
                                    <h3 className="font-display text-xl mb-4">Lead detail</h3>
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Company</dt>
                                      <dd>{lead.company_name || "—"}</dd>
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Domain</dt>
                                      <dd>{lead.domain || "—"}</dd>
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Contact</dt>
                                      <dd>{lead.name || "—"}</dd>
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Title</dt>
                                      <dd>{lead.title || "—"}</dd>
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</dt>
                                      <dd>{lead.email || "—"}</dd>
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">LinkedIn</dt>
                                      <dd className="break-all">
                                        {lead.linkedin_url ? <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="underline">{lead.linkedin_url}</a> : "—"}
                                      </dd>
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Verification</dt>
                                      <dd>{verificationLabel(lead)}</dd>
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Score</dt>
                                      <dd>{verification.score ?? "—"}</dd>
                                      <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Source</dt>
                                      <dd>{verification.source || "—"}</dd>
                                    </dl>
                                  </div>
                                  <div>
                                    <h3 className="font-display text-xl mb-4">Outreach timeline</h3>
                                    {related.length === 0 ? (
                                      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">No outreach recorded</p>
                                    ) : (
                                      <div className="space-y-4">
                                        {related.map((item) => (
                                          <div key={item.id} className="border-l border-foreground/20 pl-4">
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-widest">
                                              <span>{item.status}</span>
                                              <span className="text-muted-foreground">{item.channel}</span>
                                              <span className="text-muted-foreground">{shortDate(item.created_at)}</span>
                                            </div>
                                            <div className="mt-2 text-sm">{item.subject || "No subject"}</div>
                                            {item.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
