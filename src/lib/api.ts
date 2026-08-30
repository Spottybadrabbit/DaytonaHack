import type {
  BuildStatus,
  CreateBuildRequest,
  CreateBuildResponse,
  OwnedAgent,
  PublicAgent,
} from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type TokenGetter = () => Promise<string | null>

async function request<T>(path: string, init: RequestInit, getToken?: TokenGetter): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body) headers.set('content-type', 'application/json')

  if (getToken) {
    const token = await getToken()
    if (!token) throw new ApiError('You need to sign in before releasing an agent.', 401)
    headers.set('authorization', `Bearer ${token}`)
  }

  const res = await fetch(path, { ...init, headers })
  const text = await res.text()
  const payload = text ? safeJson(text) : null

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed with ${res.status}`
    throw new ApiError(message, res.status)
  }

  return payload as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 300) }
  }
}

/** Public marketplace listing. No auth, no owner metadata. */
export function listWildAgents(): Promise<{ agents: PublicAgent[] }> {
  return request('/api/agents', { method: 'GET' })
}

/** Owner roster. Requires a verified bearer token. */
export function listMyAgents(getToken: TokenGetter): Promise<{ agents: OwnedAgent[] }> {
  return request('/api/agents?scope=mine', { method: 'GET' }, getToken)
}

export function getAgent(id: string): Promise<{ agent: PublicAgent }> {
  return request(`/api/agents/${encodeURIComponent(id)}`, { method: 'GET' })
}

/**
 * Starts a Daytona build. Returns as soon as the background command is
 * registered — it never waits for Claude to finish.
 */
export function startBuild(
  body: CreateBuildRequest,
  getToken: TokenGetter,
): Promise<CreateBuildResponse> {
  return request('/api/builder/build', { method: 'POST', body: JSON.stringify(body) }, getToken)
}

export function getBuildStatus(agentId: string, getToken: TokenGetter): Promise<BuildStatus> {
  return request(
    `/api/builder/status?agentId=${encodeURIComponent(agentId)}`,
    { method: 'GET' },
    getToken,
  )
}
