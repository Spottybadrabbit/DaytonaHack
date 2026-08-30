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
- Verify with `npm run check`, `npm run check:builder`, the separate `api/`
  typecheck, and `npm run build` before pushing; pushes to `main` auto-deploy to
  production via Vercel.

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
