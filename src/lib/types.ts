export type AgentStatus = 'idle' | 'building' | 'published' | 'error'

/** Public projection — never contains owner metadata, sandbox ids, or credentials. */
export interface PublicAgent {
  id: string
  name: string
  species: string
  habitat: string
  brief: string
  status: AgentStatus
  previewUrl: string | null
  hunts: number
  createdAt: string
}

/** Owner projection — adds only what the owner is allowed to see. */
export interface OwnedAgent extends PublicAgent {
  errorMessage: string | null
  updatedAt: string
}

export interface BuildStatus {
  agentId: string
  status: AgentStatus
  previewUrl: string | null
  errorMessage: string | null
  /** Ordered build log lines streamed from the Daytona command. */
  logs: string[]
  /** 0-100, derived from the log phases the runner emits. */
  progress: number
  finished: boolean
}

export interface CreateBuildRequest {
  name: string
  species: string
  habitat: string
  brief: string
}

export interface CreateBuildResponse {
  agentId: string
  status: AgentStatus
}

export const SPECIES = [
  'Development',
  'Research',
  'Operations',
  'Commerce',
  'Support',
] as const

export const HABITATS = [
  'Daytona habitat',
  'The deep wilds',
  'Coastal shelf',
  'Canopy',
] as const

/** Mirrors the server-side limit in api/_lib/prompt.ts. Keep both in sync. */
export const BRIEF_MAX_LENGTH = 2000
export const NAME_MAX_LENGTH = 60
