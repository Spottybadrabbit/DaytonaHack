# Agents in the Wild — Prompt to Public Agent

Describe an app in plain English; Claude Code builds it inside an isolated Daytona
sandbox, and Agents in the Wild publishes a live, shareable preview while Builder
Bros tracks it in Supabase.

Built for the Daytona hackathon from `hackathon-prd.md`.

---

## Demo story

1. Sign in and open **Raise something wild**.
2. Name a Development agent and describe the app it should build.
3. Release it. The UI shows real build logs while Daytona runs Claude in the background.
4. The agent moves from `building` to `published` while the UI polls the authenticated build-status endpoint.
5. Open the generated app from its agent card and share the public preview URL.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

With no environment variables set the app runs in **field-lab mode**: a local
session, an in-memory roster, and a simulated build that walks the same state
machine as a real one. Copy `.env.example` to `.env` and fill in Clerk, Supabase,
Daytona, and Anthropic keys to run the real thing.

## Architecture

```text
Agents UI
  -> Clerk bearer token
  -> Vercel /api/builder/build
  -> owner check against Builder Bros Supabase
  -> Daytona sandbox + background session command
  -> Claude Agent SDK writes a static site
  -> /api/builder/status polls the command logs
  -> Supabase patches building/published/error
  -> dashboard, marketplace, and detail UI update
```

| Path | Purpose |
| --- | --- |
| `src/` | The only frontend: landing, marketplace, field lab, dashboard, agent detail |
| `api/builder/build.ts` | Verifies the caller, validates the brief, creates the sandbox, returns `202` |
| `api/builder/status.ts` | Owner-only log polling; patches Supabase on terminal states |
| `api/agents/` | Public marketplace projection and the owner roster |
| `api/_lib/runner.ts` | The fixed script uploaded into the sandbox |
| `api/_lib/daytona.ts` | Daytona SDK client plus the field-lab simulator |
| `api/_lib/store.ts` | Supabase (PostgREST) driver plus the in-memory fallback |
| `supabase/schema.sql` | The `agents` table, indexes, and the public view |

## Security model

- **Auth first.** Every builder route calls `requirePrincipal` before Supabase or
  Daytona is touched. `findOwnedAgent` returns the same `404` for a missing row and
  a row owned by someone else, so ids cannot be probed.
- **Input stays data.** The brief is written to `brief.json` and read back with
  `JSON.parse`. `RUNNER_SOURCE` and `BUILD_COMMAND` are fixed constants with no
  interpolation, so a brief can never become shell arguments or JavaScript source.
- **File tools only.** The sandbox agent gets `Read`, `Write`, `Edit`, `Glob`, and
  `Grep`. `Bash`, `WebFetch`, `WebSearch`, `Task`, and `NotebookEdit` are explicitly
  denied, and the output must be a static site.
- **Credentials stay server-side.** Daytona, Anthropic, and the Supabase service-role
  key are read only in `api/_lib/env.ts`. No preview token or API credential is
  stored on a public record or returned to the browser.
- **Short-lived sandboxes.** Only the preview port is public; the sandbox auto-stops
  after 30 minutes and auto-deletes after 60.

## Checks

```bash
npm run check          # frontend typecheck
npm run check:api      # separate api/ typecheck
npm run check:builder  # 40 builder security invariants
npm run build          # production build
npm run smoke          # end-to-end API flow against a live dev server
npm run verify         # all of the above, in order
```

`check:builder` is the gate that enforces the security model above — it parses the
generated runner, asserts the denied tool list, checks that authentication precedes
every Daytona and Supabase call, and confirms the public projection omits
`owner_id`, `sandbox_id`, `command_id`, and `error_message`.

`smoke` walks the real demo story: anonymous requests are rejected, an over-long
brief is rejected, a release returns `202` before the build finishes, another
signed-in user cannot read the build, the status endpoint reaches `published`, and
the public record carries no owner or sandbox metadata.

## Demo ceiling

This release generates static browser apps and publishes Daytona previews. It does
not create a GitHub repository or Vercel project per generated app — durable
per-app export waits until ownership, quotas, domain lifecycle, and cleanup policy
are defined.
