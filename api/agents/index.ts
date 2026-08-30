import { requirePrincipal } from '../_lib/auth.ts'
import { json, requireMethod, toResponse } from '../_lib/http.ts'
import { listByOwner, listPublished, toOwned, toPublic } from '../_lib/store.ts'

/**
 * GET /api/agents            → public projection of the wild roster
 * GET /api/agents?scope=mine → the caller's own agents, bearer token required
 */
export default async function handler(req: Request): Promise<Response> {
  try {
    requireMethod(req, 'GET')
    const scope = new URL(req.url).searchParams.get('scope')

    if (scope === 'mine') {
      const principal = await requirePrincipal(req)
      const rows = await listByOwner(principal.userId)
      return json({ agents: rows.map(toOwned) }, 200, { 'cache-control': 'no-store' })
    }

    const rows = await listPublished()
    return json({ agents: rows.map(toPublic) }, 200, { 'cache-control': 'public, max-age=15' })
  } catch (err) {
    return toResponse(err)
  }
}
