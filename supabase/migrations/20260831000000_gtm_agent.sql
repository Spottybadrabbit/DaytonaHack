begin;

-- Persistent GTM agents that live in their own Daytona sandbox.
-- These rows are linked to the existing agents table so the marketplace UI can
-- treat them as tamed creatures; sandbox/session ids stay owner-only.
create table if not exists public.gtm_agent_state (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null unique references public.agents (id) on delete cascade,
  owner_id        text not null,                -- Clerk user id
  status          text not null default 'idle'  -- idle, hunting, paused, error
                  check (status in ('idle', 'hunting', 'paused', 'error')),
  mode            text not null default 'draft' -- draft or autosend
                  check (mode in ('draft', 'autosend')),
  icp             jsonb not null default '{}',  -- target brief
  limits          jsonb not null default '{"daily_email_cap":10,"lead_notify_threshold":1}',
  state           jsonb not null default '{"cycle":0,"cursor":"","daily_sent":0,"last_reset_date":""}',
  sandbox_id      text,                         -- owner-only; never returned to browser
  session_id      text,
  command_id      text,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists gtm_agent_state_owner_idx
  on public.gtm_agent_state (owner_id, updated_at desc);

-- Leads discovered and verified by a GTM agent.
create table if not exists public.gtm_leads (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null references public.gtm_agent_state (agent_id) on delete cascade,
  owner_id        text not null,
  company_name    text,
  domain          text,
  name            text,
  title           text,
  email           text,
  linkedin_url    text,
  verification    jsonb not null default '{}',
  source_payload  jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  unique (agent_id, email) where email is not null
);

create index if not exists gtm_leads_agent_idx on public.gtm_leads (agent_id, created_at desc);

-- Outreach generated or sent by a GTM agent.
create table if not exists public.gtm_outreach (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null references public.gtm_agent_state (agent_id) on delete cascade,
  lead_id         uuid references public.gtm_leads (id) on delete set null,
  owner_id        text not null,
  channel         text not null default 'email', -- email, linkedin, etc.
  to_address      text not null,
  subject         text,
  body            text,
  status          text not null default 'draft'  -- draft, approved, sent, failed, replied
                  check (status in ('draft', 'approved', 'sent', 'failed', 'replied')),
  provider_ids    jsonb,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists gtm_outreach_agent_status_idx
  on public.gtm_outreach (agent_id, status, created_at desc);

-- Live activity feed from the GTM sandbox.
create table if not exists public.gtm_activity (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null references public.gtm_agent_state (agent_id) on delete cascade,
  owner_id        text not null,
  cycle          int not null,
  step           text not null,
  tool           text,
  subject        text,
  outcome        text,
  meta           jsonb not null default '{}',
  elapsed_ms     int,
  created_at     timestamptz not null default now()
);

create index if not exists gtm_activity_agent_idx
  on public.gtm_activity (agent_id, created_at desc);

-- Security: browser never holds service-role key.
alter table public.gtm_agent_state enable row level security;
alter table public.gtm_leads enable row level security;
alter table public.gtm_outreach enable row level security;
alter table public.gtm_activity enable row level security;
revoke all on table public.gtm_agent_state from anon, authenticated;
revoke all on table public.gtm_leads from anon, authenticated;
revoke all on table public.gtm_outreach from anon, authenticated;
revoke all on table public.gtm_activity from anon, authenticated;

commit;
