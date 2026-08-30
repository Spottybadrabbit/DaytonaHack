/**
 * Builder security gate.
 *
 * Asserts the invariants the PRD calls out: user input stays data, the sandbox
 * agent gets file tools only, ownership is checked before Daytona is touched,
 * and no credential or sandbox identifier can reach a public projection.
 *
 * Run with: npm run check:builder
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const failures = []
let checks = 0

function check(name, condition, detail = '') {
  checks += 1
  if (!condition) failures.push(detail ? `${name}\n    ${detail}` : name)
}

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

/* 1. The runner source and build command are fixed constants. -------------- */

const runnerModule = read('api/_lib/runner.ts')
const { RUNNER_SOURCE, BUILD_COMMAND } = await import('../api/_lib/runner.ts')

check(
  'BUILD_COMMAND contains no template interpolation',
  !/\$\{/.test(BUILD_COMMAND),
  'The command executed in the sandbox must never embed request data.',
)
check(
  'RUNNER_SOURCE contains no template interpolation',
  !/\$\{/.test(RUNNER_SOURCE),
  'The runner is uploaded verbatim; interpolation would turn a brief into code.',
)
check(
  'runner.ts declares no function parameters that could inject a brief',
  !/export function .*RUNNER_SOURCE/.test(runnerModule),
  'RUNNER_SOURCE must be a constant, not a builder function.',
)

/* 2. The generated runner is valid JavaScript. ----------------------------- */

const scratch = mkdtempSync(join(tmpdir(), 'aitw-runner-'))
const runnerPath = join(scratch, 'runner.mjs')
writeFileSync(runnerPath, RUNNER_SOURCE, 'utf8')
let syntaxError = null
try {
  execFileSync(process.execPath, ['--check', runnerPath], { stdio: 'pipe' })
} catch (err) {
  syntaxError = err.stderr?.toString() ?? String(err)
}
check('the generated runner parses as JavaScript', syntaxError === null, syntaxError ?? '')

/* 3. The sandbox agent gets file tools only. ------------------------------- */

for (const tool of ['Read', 'Write', 'Edit']) {
  check(`runner allows ${tool}`, RUNNER_SOURCE.includes(`'${tool}'`))
}
for (const tool of ['Bash', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit']) {
  const denied = new RegExp(`disallowedTools:[^\\]]*'${tool}'`).test(RUNNER_SOURCE)
  check(`runner denies ${tool}`, denied, `${tool} must appear in disallowedTools.`)
}
check(
  'runner reads the brief from a JSON data file',
  /JSON\.parse\(readFileSync\(BRIEF_PATH/.test(RUNNER_SOURCE),
  'The brief must be parsed as data, never evaluated.',
)

/* 4. Every builder route verifies the caller before doing work. ------------ */

for (const route of ['api/builder/build.ts', 'api/builder/status.ts']) {
  const source = read(route)
  const authAt = source.indexOf('requirePrincipal(req)')
  check(`${route} verifies the caller`, authAt > -1)

  for (const sink of ['launchBuild(', 'readBuildLogs(', 'insertAgent(', 'findOwnedAgent(']) {
    const sinkAt = source.indexOf(sink)
    if (sinkAt === -1) continue
    check(
      `${route} authenticates before ${sink.replace('(', '')}`,
      authAt > -1 && authAt < sinkAt,
      'Authentication must happen before Supabase or Daytona are touched.',
    )
  }
}

const statusSource = read('api/builder/status.ts')
check(
  'status enforces ownership with findOwnedAgent',
  statusSource.includes('findOwnedAgent('),
  'A bare findAgent lookup would let any signed-in user read another owner’s build.',
)

const buildSource = read('api/builder/build.ts')
check(
  'build returns before Claude finishes',
  !buildSource.includes('readBuildLogs') && /return json\(\{ agentId, status: 'building' \}, 202\)/.test(buildSource),
  'The route must register a background command and return 202 immediately.',
)
check(
  'launchBuild starts the sandbox command asynchronously',
  /runAsync: true/.test(read('api/_lib/daytona.ts')),
  'A synchronous session command would block the request until Claude finished.',
)
check(
  'build validates the brief before persisting it',
  buildSource.indexOf('parseBuildBrief(') < buildSource.indexOf('insertAgent('),
)

/* 5. Public projections leak nothing. -------------------------------------- */

const store = read('api/_lib/store.ts')
const publicProjection = store.slice(
  store.indexOf('export function toPublic'),
  store.indexOf('export function toOwned'),
)
for (const field of ['owner_id', 'sandbox_id', 'command_id', 'error_message']) {
  check(
    `toPublic omits ${field}`,
    !publicProjection.includes(field),
    'Public records must never carry owner metadata, sandbox ids, or errors.',
  )
}
check(
  'findOwnedAgent gives the same answer for missing and unowned rows',
  /row\.owner_id !== ownerId\)\s*throw new HttpError\('Agent not found', 404\)/.test(store),
)

/* 6. Credentials stay server-side. ----------------------------------------- */

const envSource = read('api/_lib/env.ts')
for (const secret of ['DAYTONA_API_KEY', 'ANTHROPIC_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  check(`${secret} is read server-side only`, envSource.includes(secret))
  check(
    `${secret} is never exposed to the browser bundle`,
    !envSource.includes(`VITE_${secret}`),
  )
}

const clientFiles = ['src/lib/api.ts', 'src/lib/auth.tsx', 'src/lib/useBuildStatus.ts']
for (const file of clientFiles) {
  const source = read(file)
  check(
    `${file} carries no server credential`,
    !/DAYTONA_API_KEY|ANTHROPIC_API_KEY|SERVICE_ROLE/.test(source),
  )
}

/* 7. Client and server limits agree. --------------------------------------- */

const clientTypes = read('src/lib/types.ts')
const serverPrompt = read('api/_lib/prompt.ts')
for (const limit of ['BRIEF_MAX_LENGTH = 2000', 'NAME_MAX_LENGTH = 60']) {
  check(
    `${limit.split(' ')[0]} matches on both sides`,
    clientTypes.includes(limit) && serverPrompt.includes(limit),
    'A client limit that is looser than the server limit produces confusing 400s.',
  )
}
check(
  'the brief is length-limited server-side',
  /brief\.length > BRIEF_MAX_LENGTH/.test(serverPrompt),
)

/* ------------------------------------------------------------------------- */

if (failures.length > 0) {
  console.error(`\ncheck:builder — ${failures.length} of ${checks} checks failed\n`)
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  console.error('')
  process.exit(1)
}

console.log(`check:builder — ${checks} builder security checks passed`)
