import { env, hasDaytona } from './env.ts'
import { HttpError } from './http.ts'
import { BRIEF_FILENAME, BUILD_COMMAND, RUNNER_FILENAME, RUNNER_SOURCE, SANDBOX_HOME } from './runner.ts'
import type { AgentRecord } from './store.ts'

export interface Launch {
  sandboxId: string
  sessionId: string
  commandId: string
  previewUrl: string
}

export interface BuildLogs {
  logs: string[]
  progress: number
  published: boolean
  errorMessage: string | null
  finished: boolean
}

/** Sandboxes are short-lived: they stop and then delete themselves after the demo window. */
const AUTO_STOP_MINUTES = 30
const AUTO_DELETE_MINUTES = 60

// Loaded through a computed specifier so the simulator path never needs the SDK.
const SDK_SPECIFIER = '@daytona/sdk'

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadSdk(): Promise<any> {
  try {
    return await import(/* @vite-ignore */ SDK_SPECIFIER)
  } catch {
    throw new HttpError('The Daytona SDK is not installed on this deployment', 500)
  }
}

/**
 * Creates the sandbox, uploads the runner and the brief, and starts the build
 * as a background session command. Returns as soon as the command is
 * registered — Claude keeps running long after this resolves.
 */
export async function launchBuild(agentId: string, briefJson: string): Promise<Launch> {
  if (!hasDaytona) return simulateLaunch(agentId)

  const { Daytona } = await loadSdk()
  const daytona = new Daytona({ apiKey: env.daytonaApiKey, apiUrl: env.daytonaApiUrl })

  const sandbox = await daytona.create({
    snapshot: env.daytonaSnapshot,
    language: 'typescript',
    // Only the preview port is reachable; the credential stays server-side.
    public: true,
    labels: { app: 'agents-in-the-wild', agentId },
    envVars: {
      ANTHROPIC_API_KEY: env.anthropicApiKey!,
      PREVIEW_PORT: String(env.previewPort),
    },
    autoStopInterval: AUTO_STOP_MINUTES,
    autoDeleteInterval: AUTO_DELETE_MINUTES,
  })

  // Both uploads are data. Neither is concatenated into a command.
  await sandbox.fs.uploadFiles([
    { source: Buffer.from(RUNNER_SOURCE, 'utf8'), destination: `${SANDBOX_HOME}/${RUNNER_FILENAME}` },
    { source: Buffer.from(briefJson, 'utf8'), destination: `${SANDBOX_HOME}/${BRIEF_FILENAME}` },
  ])

  const sessionId = `build-${agentId}`
  await sandbox.process.createSession(sessionId)
  const command = await sandbox.process.executeSessionCommand(sessionId, {
    command: BUILD_COMMAND,
    runAsync: true,
  })

  const commandId = command.cmdId ?? command.commandId
  if (!commandId) throw new HttpError('Daytona did not return a command id', 502)

  const preview = await sandbox.getPreviewLink(env.previewPort)

  return { sandboxId: sandbox.id, sessionId, commandId, previewUrl: preview.url }
}

/** Reads the background command's log stream and derives status from it. */
export async function readBuildLogs(agent: AgentRecord): Promise<BuildLogs> {
  if (!hasDaytona) return simulateLogs(agent)
  if (!agent.sandbox_id || !agent.command_id) {
    return { logs: [], progress: 0, published: false, errorMessage: null, finished: false }
  }

  const { Daytona } = await loadSdk()
  const daytona = new Daytona({ apiKey: env.daytonaApiKey, apiUrl: env.daytonaApiUrl })
  const sandbox = await daytona.get(agent.sandbox_id)
  const sessionId = `build-${agent.id}`

  const response = await sandbox.process.getSessionCommandLogs(sessionId, agent.command_id)
  const raw: string = response?.output ?? [response?.stdout, response?.stderr].filter(Boolean).join('\n')

  let exitCode: number | null = null
  try {
    const command = await sandbox.process.getSessionCommand(sessionId, agent.command_id)
    exitCode = typeof command?.exitCode === 'number' ? command.exitCode : null
  } catch {
    // A command that has not exited yet may 404 on some Daytona versions.
  }

  return parseRunnerOutput(raw ?? '', exitCode)
}

export async function destroySandbox(sandboxId: string): Promise<void> {
  if (!hasDaytona) return
  const { Daytona } = await loadSdk()
  const daytona = new Daytona({ apiKey: env.daytonaApiKey, apiUrl: env.daytonaApiUrl })
  const sandbox = await daytona.get(sandboxId)
  await sandbox.delete()
}

/**
 * Translates the runner's `::phase:`, `::published`, and `::error:` markers into
 * user-facing log lines and a progress percentage.
 */
export function parseRunnerOutput(raw: string, exitCode: number | null): BuildLogs {
  const logs: string[] = []
  let progress = 4
  let published = false
  let errorMessage: string | null = null

  for (const line of raw.split('\n')) {
    const text = line.trimEnd()
    if (!text) continue

    if (text.startsWith('::phase:')) {
      const [, pct, ...rest] = text.split(':').slice(1)
      const parsed = Number(pct)
      if (Number.isFinite(parsed)) progress = Math.max(progress, parsed)
      logs.push(rest.join(':').trim())
      continue
    }
    if (text === '::published') {
      published = true
      progress = 100
      continue
    }
    if (text.startsWith('::error:')) {
      errorMessage = text.slice('::error:'.length).trim()
      logs.push(errorMessage)
      continue
    }
    // npm and node noise is still useful build output, just less structured.
    logs.push(text)
  }

  if (exitCode !== null && exitCode !== 0 && !errorMessage) {
    errorMessage = `The build exited with code ${exitCode}`
  }

  return {
    logs: logs.slice(-200),
    progress: published ? 100 : Math.min(progress, 98),
    published,
    errorMessage,
    finished: published || errorMessage !== null,
  }
}

/* ------------------------------------------------------------------ *
 * Field-lab simulator — used only when Daytona/Anthropic keys are absent.
 * ------------------------------------------------------------------ */

const SIMULATED_TIMELINE: Array<[number, number, string]> = [
  [0, 8, 'Sandbox ready. Brief loaded as data.'],
  [2, 16, 'Waking Claude Code with file tools only.'],
  [5, 30, 'Claude is writing files (turn 1).'],
  [9, 46, 'Claude is writing files (turn 2).'],
  [13, 62, 'Claude is writing files (turn 3).'],
  [17, 78, 'Claude is writing files (turn 4).'],
  [21, 88, 'Static output verified. Opening the preview port.'],
  [24, 100, 'Build complete. Preview is live.'],
]

function simulateLaunch(agentId: string): Launch {
  return {
    sandboxId: `sim_${agentId}`,
    sessionId: `build-${agentId}`,
    commandId: `sim_cmd_${agentId}`,
    previewUrl: `/api/preview?agentId=${encodeURIComponent(agentId)}`,
  }
}

function simulateLogs(agent: AgentRecord): BuildLogs {
  const elapsed = (Date.now() - new Date(agent.created_at).getTime()) / 1000
  const reached = SIMULATED_TIMELINE.filter(([at]) => elapsed >= at)
  const logs = reached.map(([, , message]) => message)
  const progress = reached.length ? reached[reached.length - 1][1] : 4
  const published = progress >= 100
  return { logs, progress, published, errorMessage: null, finished: published }
}
