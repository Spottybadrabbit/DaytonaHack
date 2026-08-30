import { HttpError, json, requireMethod, toResponse } from '../_lib/http.ts'
import { findAgent, toPublic } from '../_lib/store.ts'

/** GET /api/agents/:id — public projection only. No owner or sandbox metadata. */
export default async function handler(req: Request): Promise<Response> {
  try {
    requireMethod(req, 'GET')
    const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()
    if (!id) throw new HttpError('Agent not found', 404)

    const row = await findAgent(decodeURIComponent(id))
    if (!row) throw new HttpError('Agent not found', 404)

    return json({ agent: toPublic(row) }, 200, { 'cache-control': 'no-store' })
  } catch (err) {
    return toResponse(err)
  }
}
