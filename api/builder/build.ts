import { requirePrincipal } from '../_lib/auth.ts'
import { launchBuild } from '../_lib/daytona.ts'
import { json, readJson, requireMethod, toResponse } from '../_lib/http.ts'
import { briefFile, parseBuildBrief } from '../_lib/prompt.ts'
import { insertAgent, patchAgent } from '../_lib/store.ts'

export const config = { maxDuration: 60 }

function newAgentId(): string {
  return `agt_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
}

/**
 * POST /api/builder/build
 *
 * Order matters: verify the caller, validate the brief, write the owned row,
 * then touch Daytona. Returns as soon as the background command is registered,
 * long before Claude finishes.
 */
export default async function handler(req: Request): Promise<Response> {
  try {
    requireMethod(req, 'POST')
    const principal = await requirePrincipal(req)
    const brief = parseBuildBrief(await readJson(req))

    const agentId = newAgentId()
    await insertAgent({
      id: agentId,
      owner_id: principal.userId,
      name: brief.name,
      species: brief.species,
      habitat: brief.habitat,
      brief: brief.brief,
      status: 'building',
      preview_url: null,
      error_message: null,
      sandbox_id: null,
      command_id: null,
      hunts: 0,
    })

    try {
      const launch = await launchBuild(agentId, briefFile(brief))
      // The sandbox identifiers live on the owned row, so build status survives
      // navigation, refreshes, and a cold serverless function.
      await patchAgent(agentId, {
        sandbox_id: launch.sandboxId,
        command_id: launch.commandId,
        preview_url: launch.previewUrl,
      })
    } catch (err) {
      console.error('[builder] launch failed', err)
      await patchAgent(agentId, {
        status: 'error',
        error_message: 'Failed to start the Daytona build.',
      })
      return json({ error: 'Failed to start the Daytona build.' }, 502)
    }

    return json({ agentId, status: 'building' }, 202)
  } catch (err) {
    return toResponse(err)
  }
}
