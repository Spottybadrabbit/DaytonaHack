begin;

-- Keep Builder Bros' existing marketplace columns and add the fields the
-- Agents in the Wild UI already depends on. Every addition is nullable or has
-- a default, so the current Builder Bros application remains compatible.
alter table public.agents
  add column if not exists legacy_convex_id text,
  add column if not exists legacy_owner_id text,
  add column if not exists legacy_creation_time double precision,
  add column if not exists agent_type text not null default 'Custom',
  add column if not exists status text not null default 'idle',
  add column if not exists performance numeric(7, 2) not null default 0,
  add column if not exists is_active boolean not null default false,
  add column if not exists is_wild boolean not null default false,
  add column if not exists sprite_url text,
  add column if not exists api_endpoint text,
  add column if not exists api_key text,
  add column if not exists platform text,
  add column if not exists platform_config jsonb not null default '{}'::jsonb;

drop index if exists public.agents_legacy_convex_id_key;
create unique index agents_legacy_convex_id_key
  on public.agents (legacy_convex_id);
create index if not exists agents_creator_status_idx
  on public.agents (creator_id, status);

alter table public.usage_analytics
  add column if not exists legacy_convex_id text;
drop index if exists public.usage_analytics_legacy_convex_id_key;
create unique index usage_analytics_legacy_convex_id_key
  on public.usage_analytics (legacy_convex_id);

-- The browser never receives the service-role key. All reads and writes flow
-- through Clerk-authenticated Vercel functions, so direct table access stays
-- closed even if a public Supabase key leaks from another Builder Bros app.
alter table public.agents enable row level security;
alter table public.sandboxes enable row level security;
alter table public.usage_analytics enable row level security;
revoke all on table public.agents from anon, authenticated;
revoke all on table public.sandboxes from anon, authenticated;
revoke all on table public.usage_analytics from anon, authenticated;

commit;
