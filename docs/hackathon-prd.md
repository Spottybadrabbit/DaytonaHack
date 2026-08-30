# Agents in the Wild — Hackathon PRD

## Product

Agents in the Wild turns a plain-English app idea into a live public preview. A signed-in user creates a Development agent in the existing field-lab UI; Claude Code builds the site inside an isolated Daytona sandbox; the existing Builder Bros Supabase project stores agents, projects, sandboxes, and build state.

## Demo story

1. Sign in and open **Raise something wild**.
2. Name a Development agent and describe the app it should build.
3. Release it. The UI shows real build logs while Daytona runs Claude in the background.
4. The agent changes from `building` to `published` while the UI polls the authenticated build-status endpoint.
5. Open the generated app from its agent card or detail page and share the public preview URL.

## Success criteria

- Only authenticated users can start or inspect builds.
- A build request returns before the long-running Claude process finishes.
- User input is passed as data, never interpolated into shell or JavaScript source.
- Claude runs in Daytona, not in the Vercel function filesystem.
- The sandbox blocks shell and web tools during generation; generated output is limited to static site files.
- Build status survives navigation because the sandbox command identifiers live on the owned Supabase agent.
- A successful build exposes an HTTPS preview URL on the public agent record.
- `npm run check`, `npm run check:builder`, the separate `api/` typecheck, the production build, and one realistic API/browser flow pass before production promotion.

## Architecture

```text
Agents UI
  -> Clerk bearer token
  -> Vercel /api/builder/build
  -> owner check against Builder Bros Supabase
  -> Daytona sandbox + background command
  -> Claude Agent SDK writes a static site
  -> /api/builder/status polls command logs
  -> Supabase patches building/published/error
  -> existing live dashboard, marketplace, and detail UI update
```

The implementation reuses Builder Bros' existing `users`, `projects`, `sandboxes`, `agents`, and billing data model. Agents in the Wild remains the only frontend; no second queue, frontend, or billing model is introduced.

## Security and lifecycle

- Clerk verifies every builder request; the Vercel API checks Supabase ownership before touching Daytona.
- Daytona and Anthropic credentials remain server-side.
- Prompts are length-limited and uploaded as a file.
- The agent gets file tools only. Bash, web access, subagents, and notebooks are explicitly denied.
- Sandboxes are public only for their preview port and auto-delete after the demo window.
- No preview token or API credential is stored on a public Supabase record or returned to the browser.

## Recovery and migration

- Root cause of the blank production page: the Convex deployment had been disabled after exceeding its free-plan limit; DNS and the Vercel deployment were healthy.
- Production export: 6 agents and 0 usage rows. All 6 agent IDs reconciled after an idempotent upsert into Builder Bros Supabase; 4 remain wild and 2 remain owned by their original Clerk user.
- Legacy Convex IDs, owners, timestamps, status, platform configuration, and any private API-key field are preserved. Public API projections never return owner metadata, sandbox identifiers, or API keys.
- The `convex/` directory and old Vercel environment value remain temporarily for rollback, but production client code no longer imports or calls Convex.

## Branch decisions

### Agents in the Wild

- Build from `main`.
- Skip `dev` (environment badge), `auto-sync/2026-08-07` (referral page), and the empty `staging` delta; none helps the builder demo.
- Skip the local Claude branch because its patch is already present on `main`.

### Butler Bros

- Reuse the Daytona create/run/preview behavior from `lovable` as a reference, not as a merge.
- Skip `main`'s generator because it runs Claude in the Vercel filesystem and no longer creates Daytona previews.
- Skip `auto-sync/2026-06-08` because it only changes `.DS_Store`.
- Skip `feature/connect4-game` because it has unrelated history, no Daytona integration, and a syntax error.

## Explicit demo ceiling

The first release generates static browser apps and publishes Daytona previews. It does not create a new GitHub repository or Vercel project for each generated app. Add durable per-app GitHub/Vercel export after the hackathon when ownership, quotas, domain lifecycle, and cleanup policy are defined.

## Submission copy

- **Title:** Agents in the Wild — Prompt to Public Agent
- **One-liner:** Describe an app in plain English; Claude Code builds it inside an isolated Daytona sandbox, and Agents in the Wild publishes a live, shareable preview while Builder Bros tracks it in Supabase.
