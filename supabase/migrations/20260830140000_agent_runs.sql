begin;

-- Chat-dispatched agent runs (Parallel research/enrichment/FindAll, Deepline GTM).
-- Long-running work started from the chat window lands here so the UI can poll it,
-- the owner can navigate away, and a cold serverless function can resume it.
create table if not exists public.agent_runs (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null,                 -- Clerk user id
  kind          text not null
                check (kind in ('deep_research', 'enrich', 'find_all', 'gtm_contact')),
  status        text not null default 'queued'
                check (status in ('queued', 'running', 'succeeded', 'failed')),
  title         text not null,
  objective     text not null,
  -- Provider correlation ids. Never returned to the browser.
  provider      text not null check (provider in ('parallel', 'deepline')),
  provider_run_id text,
  sandbox_id    text,
  session_id    text,
  command_id    text,
  -- Result payload and error, both owner-only.
  result        jsonb,
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists agent_runs_owner_idx
  on public.agent_runs (owner_id, created_at desc);
create index if not exists agent_runs_active_idx
  on public.agent_runs (status) where status in ('queued', 'running');

-- Same posture as the rest of Builder Bros: the browser never holds the
-- service-role key, so no anon/authenticated grant is issued.
alter table public.agent_runs enable row level security;
revoke all on table public.agent_runs from anon, authenticated;

commit;
