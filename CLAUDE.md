# Agents in the Wild

A marketplace of autonomous AI agents, rendered as pixel-art creatures you
discover in "The Wilds" and tame. Vite + React SPA (`client/`), wouter routing,
Vercel serverless functions (`api/`), Clerk auth + billing, and the existing
Builder Bros Supabase project as the backend of record. A legacy Express server
lives in `server/` (local dev only; production runs `api/`).

## Design system — the COMPUTE editorial language (MANDATORY on every page)

Every page and component follows the landing page's design system. When adding
or restyling UI, match `client/src/components/landing/*` and
`client/src/pages/site/*` — never default shadcn styling.

### Typography
- `font-display` — Instrument Serif. All headlines and large numerals.
  Hero-scale headlines pair with `.text-stroke` (outline text) on ONE accent word.
- `font-mono` — JetBrains Mono. Eyebrows, labels, tags, technical captions —
  always `text-xs uppercase tracking-widest`.
- Body — Instrument Sans (default), `text-muted-foreground` for supporting copy.
- Never bold-sans headlines (`text-4xl font-bold` is the old style; replace on sight).

### Color
- Dark editorial base: `bg-background` / `text-foreground` / `text-muted-foreground`.
- ONE accent: `#eca8d6` (pink) — used sparingly: pulse dots, checkmarks,
  performance numbers, tiny highlights. Never as large fills.
- No green/red/blue/yellow accent buttons or icon rainbows. Semantic status may
  use muted red/amber dots only.

### Surfaces & layout
- Hairline borders: `border border-foreground/10`, hover `border-foreground/30`.
- SQUARE corners everywhere — no `rounded-*` on cards/buttons (nav pills on the
  landing ComputeNav are the one sanctioned exception).
- Subtle fills: `bg-foreground/[0.02]`–`[0.04]`. No shadows.
- Section shell: `max-w-[1400px] mx-auto px-6 lg:px-12`, vertical `py-32 lg:py-40`.
- Numbered markers: mono `01` / `02` … on cards and section items.
- Eyebrow pattern above headlines: `w-12 h-px bg-foreground/30` rule + mono label
  (component: `client/src/pages/site/eyebrow.tsx`).

### Buttons
- Primary: `bg-foreground text-background hover:bg-foreground/90`, square.
- Secondary: `border border-foreground/20 hover:border-foreground hover:bg-foreground/5`.
- Link-style: mono text + `ArrowRight`/`ArrowUpRight` with hover translate.

### Motion
- Scroll reveal on every section: IntersectionObserver → `opacity-0 translate-y-8`
  → `opacity-100 translate-y-0`, `transition-all duration-700`, staggered delays.
- Reuse `client/src/pages/site/use-reveal.ts` + `reveal.tsx` — do not duplicate
  observers.

### Creatures (agent sprites)
- Agents render as pixel sprites via `getPokemonSpriteUrl` (`client/src/lib/utils.ts`).
- Sprites are FOCAL: left-positioned square hairline cell (~64–72px), sprite
  ~44–48px inside, `style={{ imageRendering: "pixelated" }}` always, subtle
  `group-hover:scale-110`.
- Entities without a stored sprite use `getStableTechPokemonId(id)` — never the
  random variant in render paths (causes shuffle on re-render).

### Brand narrative & lexicon
Field-guide storytelling (Alice-in-Wonderland flavor is fine — public domain;
NEVER use the word "Pokémon" or any Nintendo trademark in UI copy):
- Marketplace = **The Wilds**; Apify actors = **wild agents / creatures / species**
  ("actor" only in small mono technical captions, e.g. `species: apify/web-scraper`).
- Fetching new actors = an **expedition** / "scouting the wilds".
- Adopting/deploying = **taming** ("Tame this agent").
- Status language: "All agents operational", pulse dots.

### Navigation rules
- Landing + site pages (`/`, /about, /blog, /careers, /contact, /status,
  /privacy, /terms, /security) are CHROMELESS — they ship their own nav/footer.
  The set lives in `App.tsx` (`CHROMELESS_ROUTES`); add new marketing pages there.
- Pricing link: landing ComputeNav only (`#pricing` scroll). NOT in the app Navbar.

## Engineering constraints
- `"type": "module"` — relative imports inside `api/` MUST end in `.js` or the
  function crashes at runtime on Vercel (ERR_MODULE_NOT_FOUND). tsconfig does
  not cover `api/`, so tsc will not catch it.
- Vite `root` is `client/`; `envDir` points at the repo root — keep it that way
  or `VITE_*` vars silently vanish from local builds.
- Clerk: `@clerk/react` v6 — `SignedIn`/`SignedOut` do NOT exist; use
  `<Show when="signed-in">`. Plan slugs: `free_user`, `standard_plan` (user,
  $60/mo), `standard` (org, per-seat). Quota source of truth:
  `client/src/lib/plans.ts`. Server verification: `api/_lib/clerk.ts`.
- Never commit `.env*` (gitignored; `.env.example` is the template). Dev server:
  `npm run dev` → port 3000 or next free (3000 often taken by another project).
- Verify with `npm run verify` (= `check` + `check:api` + `check:builder` +
  `build`) before pushing; pushes to `main` auto-deploy to production via Vercel.

## Field lab chat + specialist agents (`/chat`)

Signed-in surface at `/chat` (`client/src/pages/chat.tsx`, wired in `App.tsx`
behind `RequireAuth`, linked from the app Navbar as **Field Lab**). A Claude
tool-calling loop picks a specialist, dispatches it as a background run, and the
chat renders one polling run card per dispatch.

### Flow map

```mermaid
sequenceDiagram
    autonumber
    actor U as Researcher
    participant UI as /chat
    participant C as POST /api/chat
    participant AN as Claude (claude-opus-5)
    participant DB as Supabase agent_runs
    participant P as Parallel API
    participant DT as Daytona GTM sandbox
    participant R as GET /api/runs/:id

    U->>UI: "Find all UK VCs investing in Physical AI"
    UI->>C: messages[] + Clerk bearer token
    C->>C: requireUser -> syncClerkUser
    C->>AN: messages + 4 tool definitions
    AN-->>C: tool_use find_all { entity_type, match_conditions }
    C->>C: Zod-validate the tool input (the model is not the gate)
    C->>DB: insertRun(kind, provider, owner_id) -> run id
    alt Parallel specialist
        C->>P: taskRun.create | beta.findall.create
        P-->>C: provider run id
    else GTM specialist
        C->>DT: create sandbox, upload gtm-runner.mjs + payload.json
        C->>DT: executeSessionCommand(runAsync = true)
        DT-->>C: sandboxId + sessionId + cmdId
    end
    C->>DB: patchRun(status = running, provider ids)
    C->>AN: tool_result "dispatched, run <id>"
    AN-->>C: short reply
    C-->>UI: { reply, runs[] }

    loop every 4s per card until terminal
        UI->>R: GET /api/runs/:id
        R->>DB: findOwnedRun -> 404 if missing OR not owned
        R->>P: retrieve -> result when completed
        R->>DT: getSessionCommandLogs -> ::deepline-result / ::deepline-auth
        R->>DB: patchRun on terminal state; delete GTM sandbox
        R-->>UI: { run }
    end
```

### The four specialists

| Tool | Provider | Returns | Notes |
| --- | --- | --- | --- |
| `deep_research` | Parallel Task API, `ultra` | Markdown report with inline citations | Minutes; can reach 45 |
| `find_all` | Parallel FindAll, `core` | Candidate roster with per-condition verdicts | **the VC agent** |
| `enrich_records` | Parallel Task API, `core` | JSON record, one researched field each | Schema built from the tool input |
| `gtm_find_contact` | Deepline CLI in a Daytona sandbox | Verified GTM contact data | Needs one-time browser auth |

### Two sandbox trust tiers — keep them apart

- **Site builder** (`api/builder/build.ts`): Claude Code, file tools only, no
  shell, serves a public preview port. Never widen `allowedTools`.
- **GTM runner** (`api/_lib/deepline.ts`): needs a shell to drive the `deepline`
  CLI, so it gets **no Claude**, **no public port**, and is deleted as soon as it
  answers. The tool name and payload are uploaded as `payload.json` and passed to
  `execFile` as an **argv array** — never a shell string.

`npm run check:builder` gates both runners. It asserts the site runner's tool
list and the GTM runner's argv-not-shell invariant, and parses both with esbuild.

### Every sandbox spins up with Parallel

`api/builder/build.ts` upserts a host-scoped `agents_wild_parallel` Daytona
secret, injects `PARALLEL_API_KEY`, adds `api.parallel.ai` to the
`domainAllowList`, and installs `parallel-web` alongside the agent SDK — so a
generated app can do its own research. Optional: without `PARALLEL_API_KEY` the
build still succeeds, just without Parallel.

### Engineering notes

- `agent_runs` (migration `20260830140000_agent_runs.sql`) carries the provider
  correlation ids (`provider_run_id`, `sandbox_id`, `session_id`, `command_id`).
  They are **owner-only** — `toRunView` strips them, so a run survives navigation
  and a cold function without ever exposing sandbox identifiers.
- `findOwnedRun` returns the same `null` for missing and not-owned, so run ids
  cannot be probed. `/api/runs/:id` 404s identically for a malformed uuid.
- `npm run check:api` (new, `tsconfig.api.json`) typechecks `api/` with
  `moduleResolution: NodeNext`, which is what actually catches a missing `.js`
  extension on a relative import before Vercel does at runtime.
- Claude config in `api/chat.ts`: `claude-opus-5`, `thinking: { type: "adaptive" }`,
  no `temperature`, `max_tokens: 8000`, `MAX_TOOL_ROUNDS = 4`,
  `MAX_RUNS_PER_TURN = 3`.

<!-- convex-ai-start -->

The `convex/` directory is retained temporarily as a rollback source after the
production data migration to Supabase; the deployed app no longer calls it.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
