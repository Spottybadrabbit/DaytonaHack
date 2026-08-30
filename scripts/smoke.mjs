/**
 * One realistic end-to-end flow against a running dev server.
 *
 * Boots Vite (which mounts the api/ handlers), then walks the demo story:
 * anonymous rejection → release → poll → published → public projection.
 *
 * Run with: npm run smoke
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 5199
const BASE = `http://localhost:${PORT}`
const TOKEN = 'demo:demo_smoke-runner'

const results = []
function step(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail && !ok ? `\n      ${detail}` : ''}`)
}

async function waitForServer(timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/agents`)
      if (res.ok) return true
    } catch {
      // Server is still starting.
    }
    await sleep(400)
  }
  return false
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, BROWSER: 'none' },
})
const serverLog = []
server.stdout.on('data', (c) => serverLog.push(c.toString()))
server.stderr.on('data', (c) => serverLog.push(c.toString()))

let exitCode = 0
try {
  console.log('\nAgents in the Wild — end-to-end flow\n')

  if (!(await waitForServer())) {
    console.error('dev server never became ready:\n' + serverLog.join(''))
    process.exit(1)
  }

  // 1. Anonymous callers cannot start a build.
  const anon = await fetch(`${BASE}/api/builder/build`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Interloper',
      species: 'Development',
      habitat: 'Daytona habitat',
      brief: 'A page that should never be built because the caller is anonymous.',
    }),
  })
  step('anonymous build is rejected with 401', anon.status === 401, `got ${anon.status}`)

  // 2. An over-long brief is rejected before anything is created.
  const tooLong = await fetch(`${BASE}/api/builder/build`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      name: 'Overflow',
      species: 'Development',
      habitat: 'Daytona habitat',
      brief: 'x'.repeat(2001),
    }),
  })
  step('over-long brief is rejected with 400', tooLong.status === 400, `got ${tooLong.status}`)

  // 3. A signed-in researcher releases an agent.
  const released = await fetch(`${BASE}/api/builder/build`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      name: 'Smoketrail',
      species: 'Development',
      habitat: 'Daytona habitat',
      brief: 'A one-page tide chart for Cornish surf spots with a sparkline per beach.',
    }),
  })
  const body = await released.json()
  step('release returns 202 with an agent id', released.status === 202 && !!body.agentId, JSON.stringify(body))
  const agentId = body.agentId
  if (!agentId) throw new Error('no agent id returned')

  // 4. The build status is owner-only.
  const foreign = await fetch(`${BASE}/api/builder/status?agentId=${agentId}`, {
    headers: { authorization: 'Bearer demo:demo_someone-else' },
  })
  step('another signed-in user cannot read the build', foreign.status === 404, `got ${foreign.status}`)

  // 5. Poll until the build finishes.
  let status = null
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/api/builder/status?agentId=${agentId}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    })
    status = await res.json()
    if (status.finished) break
    await sleep(1500)
  }
  step('the build reaches published', status?.status === 'published', JSON.stringify(status))
  step(
    'the build streamed log lines',
    Array.isArray(status?.logs) && status.logs.length > 0,
    JSON.stringify(status?.logs),
  )
  step('a preview URL is exposed', typeof status?.previewUrl === 'string' && status.previewUrl.length > 0)

  // 6. The public projection leaks nothing.
  const publicRes = await fetch(`${BASE}/api/agents/${agentId}`)
  const publicBody = await publicRes.json()
  const serialised = JSON.stringify(publicBody)
  step('public record is readable', publicRes.status === 200 && publicBody.agent?.id === agentId)
  step(
    'public record carries no owner or sandbox metadata',
    !/owner|sandbox|command_id|apiKey|token/i.test(serialised),
    serialised,
  )

  // 7. The owner roster shows the agent.
  const roster = await fetch(`${BASE}/api/agents?scope=mine`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  })
  const rosterBody = await roster.json()
  step(
    'the agent appears on the owner roster',
    Array.isArray(rosterBody.agents) && rosterBody.agents.some((a) => a.id === agentId),
  )

  // 8. The preview renders.
  const preview = await fetch(`${BASE}${status.previewUrl}`)
  step('the preview URL serves HTML', preview.ok && (preview.headers.get('content-type') ?? '').includes('text/html'))
} catch (err) {
  step('flow completed without throwing', false, String(err))
} finally {
  server.kill('SIGTERM')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} steps passed\n`)
if (failed.length > 0) exitCode = 1
process.exit(exitCode)
