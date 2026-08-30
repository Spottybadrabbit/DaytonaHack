import { apiRequest } from "./queryClient";

export interface GtmIcp {
  query?: string;
  industry?: string;
  location?: string;
  employee_count?: string;
  roles?: string[];
  subject?: string;
  template?: string;
  limit?: number;
  max_companies_per_cycle?: number;
  contacts_per_company?: number;
  daily_email_cap?: number;
}

export interface GtmAgent {
  id: string;
  agent_id: string;
  status: "idle" | "hunting" | "paused" | "error";
  mode: "draft" | "autosend";
  icp: GtmIcp;
  created_at: string;
  updated_at: string;
}

export interface GtmLead {
  id: string;
  name: string | null;
  title: string | null;
  company_name: string | null;
  email: string | null;
  created_at: string;
}

export interface GtmOutreach {
  id: string;
  to_address: string;
  subject: string | null;
  status: "draft" | "approved" | "sent" | "failed" | "replied";
  created_at: string;
}

export interface GtmActivity {
  id: string;
  cycle: number;
  step: string;
  tool: string | null;
  subject: string | null;
  outcome: string | null;
  created_at: string;
}

export async function listGtmAgents(token: string): Promise<{ agents: GtmAgent[] }> {
  const res = await apiRequest("GET", "/api/gtm/list", undefined, token);
  return res.json();
}

export async function getGtmAgent(id: string, token: string): Promise<{ agent: GtmAgent; leads: GtmLead[]; outreach: GtmOutreach[]; activity: GtmActivity[] }> {
  const res = await apiRequest("GET", `/api/gtm/${encodeURIComponent(id)}`, undefined, token);
  return res.json();
}

export async function tameGtmAgent(name: string, icp: GtmIcp, mode: "draft" | "autosend", token: string): Promise<{ agent: { id: string; name: string } }> {
  const res = await apiRequest("POST", "/api/gtm/tame", { name, icp, mode }, token);
  return res.json();
}

export async function huntGtm(id: string, token: string): Promise<{ started: boolean }> {
  const res = await apiRequest("POST", `/api/gtm/${encodeURIComponent(id)}`, { action: "hunt" }, token);
  return res.json();
}

export async function approveOutreach(outreachId: string, token: string): Promise<{ approved: string }> {
  const res = await apiRequest("POST", "/api/gtm/approve", { outreach_id: outreachId }, token);
  return res.json();
}
