import { requireUser } from "../_lib/clerk.js";
import { destroyGtmSandbox, pollGtmRun } from "../_lib/deepline.js";
import { pollFindAll, pollTaskRun } from "../_lib/parallel.js";
import { findOwnedRun, patchRun, toRunView, type AgentRunRow } from "../_lib/runs.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Progress {
  status: "queued" | "running" | "succeeded" | "failed";
  result: unknown;
  errorMessage: string | null;
  authorizationUrl?: string | null;
}

async function readProgress(run: AgentRunRow): Promise<Progress> {
  if (run.provider === "deepline") {
    if (!run.sandbox_id || !run.session_id || !run.command_id) {
      return { status: "running", result: null, errorMessage: null };
    }
    return pollGtmRun({
      sandboxId: run.sandbox_id,
      sessionId: run.session_id,
      commandId: run.command_id,
    });
  }

  if (!run.provider_run_id) return { status: "queued", result: null, errorMessage: null };
  return run.kind === "find_all"
    ? pollFindAll(run.provider_run_id)
    : pollTaskRun(run.provider_run_id);
}

/**
 * GET /api/runs/:id — owner-only run status.
 *
 * Polls the provider, patches Supabase on terminal states, and tears the GTM
 * sandbox down once it has produced its answer. Because the provider ids live on
 * the owned row, this resumes correctly after navigation or a cold function.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = String(rawId ?? "");
  // Same 404 for malformed, missing, and not-owned so run ids cannot be probed.
  if (!UUID.test(id)) return res.status(404).json({ error: "Run not found" });

  try {
    const run = await findOwnedRun(id, user.userId);
    if (!run) return res.status(404).json({ error: "Run not found" });

    res.setHeader("Cache-Control", "no-store");
    if (run.status === "succeeded" || run.status === "failed") {
      return res.status(200).json({ run: toRunView(run) });
    }

    const progress = await readProgress(run);
    if (progress.status === run.status) {
      return res.status(200).json({ run: toRunView(run) });
    }

    const patch: Partial<AgentRunRow> = { status: progress.status };
    if (progress.status === "succeeded") patch.result = progress.result;
    if (progress.status === "failed") {
      patch.error_message = progress.authorizationUrl
        ? `${progress.errorMessage} Authorize here: ${progress.authorizationUrl}`
        : progress.errorMessage;
    }
    await patchRun(run.id, patch);

    // The GTM sandbox exists only to produce this answer; reclaim it now rather
    // than waiting for Daytona's auto-delete window.
    const terminal = progress.status === "succeeded" || progress.status === "failed";
    if (terminal && run.provider === "deepline" && run.sandbox_id && !progress.authorizationUrl) {
      await destroyGtmSandbox(run.sandbox_id);
    }

    return res.status(200).json({ run: toRunView({ ...run, ...patch } as AgentRunRow) });
  } catch (error) {
    console.error(`[runs/${id}] ${error instanceof Error ? error.message : error}`);
    return res.status(502).json({ error: "Couldn't read the run status." });
  }
}
