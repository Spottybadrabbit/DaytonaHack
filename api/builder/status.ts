import { requirePrincipal } from '../_lib/auth.ts'
import { readBuildLogs } from '../_lib/daytona.ts'
import { HttpError, json, requireMethod, toResponse } from '../_lib/http.ts'
import { findOwnedAgent, patchAgent, type AgentStatus } from '../_lib/store.ts'

/**
 * GET /api/builder/status?agentId=…
 *
 * Owner-only. Reads the background command's logs and patches Supabase when the
 * build reaches a terminal state, so the roster stays correct even if the
 * browser closes mid-build.
 */
export default async function handler(req: Request): Promise<Response> {
  try {
    requireMethod(req, 'GET')
    const principal = await requirePrincipal(req)

    const agentId = new URL(req.url).searchParams.get('agentId')
    if (!agentId) throw new HttpError('agentId is required', 400)

    const agent = await findOwnedAgent(agentId, principal.userId)

    if (agent.status === 'published' || agent.status === 'error') {
      return json({
        agentId,
        status: agent.status,
        previewUrl: agent.preview_url,
        errorMessage: agent.error_message,
        logs: [],
        progress: 100,
        finished: true,
      })
    }

    const build = await readBuildLogs(agent)

    let status: AgentStatus = agent.status
    if (build.published) status = 'published'
    else if (build.errorMessage) status = 'error'

    if (status !== agent.status) {
      await patchAgent(agentId, {
        status,
        error_message: build.errorMessage,
        ...(status === 'published' ? { hunts: agent.hunts + 1 } : {}),
      })
    }

    return json({
      agentId,
      status,
      previewUrl: status === 'published' ? agent.preview_url : null,
      errorMessage: build.errorMessage,
      logs: build.logs,
      progress: build.progress,
      finished: build.finished,
    })
  } catch (err) {
    return toResponse(err)
  }
}
