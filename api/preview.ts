import { fail, requireMethod, toResponse } from './_lib/http.ts'
import { hasDaytona } from './_lib/env.ts'
import { findAgent } from './_lib/store.ts'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

/**
 * GET /api/preview?agentId=…
 *
 * Stand-in preview for field-lab mode. With Daytona configured, the preview URL
 * points at the sandbox instead and this route is never used.
 */
export default async function handler(req: Request): Promise<Response> {
  try {
    requireMethod(req, 'GET')
    if (hasDaytona) return fail('Previews are served by Daytona on this deployment', 404)

    const agentId = new URL(req.url).searchParams.get('agentId')
    const agent = agentId ? await findAgent(agentId) : null
    if (!agent) return fail('Agent not found', 404)

    const name = escapeHtml(agent.name)
    const brief = escapeHtml(agent.brief)

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${name} — simulated preview</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:2rem;
         background:#0b0d10; color:#f2f1ee; font:16px/1.6 ui-sans-serif,system-ui,sans-serif }
  main { max-width:38rem }
  p.tag { font:11px/1 ui-monospace,monospace; letter-spacing:.22em; text-transform:uppercase; color:#7c8591 }
  h1 { font:400 clamp(2rem,6vw,3.25rem)/1.1 Georgia,serif; margin:.6rem 0 1rem }
  blockquote { margin:0; padding:1rem 1.25rem; border-left:2px solid #2b3038; color:#a8b0ba }
  footer { margin-top:2rem; font:12px/1.6 ui-monospace,monospace; color:#7c8591 }
</style></head>
<body><main>
  <p class="tag">Agents in the Wild — simulated preview</p>
  <h1>${name}</h1>
  <blockquote>${brief}</blockquote>
  <footer>Configure DAYTONA_API_KEY and ANTHROPIC_API_KEY to have Claude Code build and publish the real app inside a sandbox.</footer>
</main></body></html>`

    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  } catch (err) {
    return toResponse(err)
  }
}
