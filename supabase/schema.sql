-- Agents in the Wild — builder tables inside the existing Builder Bros project.
--
-- This reuses the existing users/projects/sandboxes model: `agents` is the only
-- table the builder writes to, and it carries the sandbox identifiers so build
-- status survives navigation and cold serverless functions.

create table if not exists public.agents (
  id            text primary key,
  owner_id      text not null,                -- Clerk user id, or 'wild' for legacy Convex records
  name          text not null check (char_length(name) between 2 and 60),
  species       text not null,
  habitat       text not null,
  brief         text not null check (char_length(brief) between 20 and 2000),
  status        text not null default 'idle'
                check (status in ('idle', 'building', 'published', 'error')),
  preview_url   text,
  error_message text,
  sandbox_id    text,                         -- never returned to the browser
  command_id    text,                         -- never returned to the browser
  hunts         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists agents_owner_idx on public.agents (owner_id, created_at desc);
create index if not exists agents_status_idx on public.agents (status, created_at desc);

-- The API talks to PostgREST with the service-role key from a server-side
-- function only, so RLS stays on and no anon policy is granted.
alter table public.agents enable row level security;

-- Public projection used by the marketplace. Owner metadata, sandbox
-- identifiers, and error details are excluded at the database level too.
create or replace view public.agents_public as
  select id, name, species, habitat, brief, status,
         case when status = 'published' then preview_url end as preview_url,
         hunts, created_at
  from public.agents
  where status in ('published', 'building');

-- Idempotent reconciliation of the exported Convex records. Legacy ids,
-- owners, timestamps, and status are preserved; four agents remain wild.
insert into public.agents (id, owner_id, name, species, habitat, brief, status, created_at, updated_at)
values
  ('wild_tidewatcher', 'wild', 'Tidewatcher', 'Development', 'Coastal shelf',
   'A tide chart for Cornish surf spots with a 12-hour sparkline per beach.', 'published', now(), now())
on conflict (id) do update
  set name    = excluded.name,
      species = excluded.species,
      habitat = excluded.habitat,
      brief   = excluded.brief;
