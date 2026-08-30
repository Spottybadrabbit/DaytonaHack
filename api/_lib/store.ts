import { env, hasSupabase } from './env.ts'
import { HttpError } from './http.ts'

export type AgentStatus = 'idle' | 'building' | 'published' | 'error'

/** The full row. Sandbox identifiers and owner ids never leave the server. */
export interface AgentRecord {
  id: string
  owner_id: string
  name: string
  species: string
  habitat: string
  brief: string
  status: AgentStatus
  preview_url: string | null
  error_message: string | null
  sandbox_id: string | null
  command_id: string | null
  hunts: number
  created_at: string
  updated_at: string
}

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

export interface OwnedAgent extends PublicAgent {
  errorMessage: string | null
  updatedAt: string
}

/** Public projection — no owner metadata, no sandbox identifiers, no keys. */
export function toPublic(row: AgentRecord): PublicAgent {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    habitat: row.habitat,
    brief: row.brief,
    status: row.status,
    previewUrl: row.status === 'published' ? row.preview_url : null,
    hunts: row.hunts,
    createdAt: row.created_at,
  }
}

export function toOwned(row: AgentRecord): OwnedAgent {
  return { ...toPublic(row), previewUrl: row.preview_url, errorMessage: row.error_message, updatedAt: row.updated_at }
}

/* ------------------------------------------------------------------ *
 * Supabase (PostgREST) driver
 * ------------------------------------------------------------------ */

const TABLE = 'agents'

async function pg<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.supabaseServiceKey!,
      authorization: `Bearer ${env.supabaseServiceKey}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    console.error('[supabase]', res.status, await res.text())
    throw new HttpError('The agent record could not be reached', 502)
  }
  return (await res.json()) as T
}

/* ------------------------------------------------------------------ *
 * In-memory driver — used only when Supabase is not configured.
 * ------------------------------------------------------------------ */

const memory = new Map<string, AgentRecord>()
let seeded = false

function seed() {
  if (seeded) return
  seeded = true
  const now = Date.now()
  const samples: Array<[string, string, string, string, number]> = [
    ['Tidewatcher', 'Development', 'Coastal shelf', 'A tide chart for Cornish surf spots with a 12-hour sparkline per beach.', 128],
    ['Understory', 'Research', 'Canopy', 'Summarises new arXiv agent papers into a one-screen daily field note.', 64],
    ['Nightjar', 'Operations', 'The deep wilds', 'A status wall that groups incidents by service and shows the last deploy.', 41],
    ['Kelpline', 'Commerce', 'Daytona habitat', 'A pricing page builder that renders three tiers from a JSON brief.', 12],
  ]
  samples.forEach(([name, species, habitat, brief, hunts], i) => {
    const id = `wild_${name.toLowerCase()}`
    const created = new Date(now - (i + 1) * 7_200_000).toISOString()
    memory.set(id, {
      id,
      owner_id: 'wild',
      name,
      species,
      habitat,
      brief,
      status: 'published',
      preview_url: `/api/preview?agentId=${id}`,
      error_message: null,
      sandbox_id: null,
      command_id: null,
      hunts,
      created_at: created,
      updated_at: created,
    })
  })
}

/* ------------------------------------------------------------------ *
 * Public store API
 * ------------------------------------------------------------------ */

export async function insertAgent(
  row: Omit<AgentRecord, 'created_at' | 'updated_at'>,
): Promise<AgentRecord> {
  const now = new Date().toISOString()
  const full: AgentRecord = { ...row, created_at: now, updated_at: now }
  if (!hasSupabase) {
    seed()
    memory.set(full.id, full)
    return full
  }
  const [created] = await pg<AgentRecord[]>(TABLE, { method: 'POST', body: JSON.stringify(full) })
  return created
}

export async function patchAgent(id: string, patch: Partial<AgentRecord>): Promise<void> {
  const body = { ...patch, updated_at: new Date().toISOString() }
  if (!hasSupabase) {
    seed()
    const existing = memory.get(id)
    if (existing) memory.set(id, { ...existing, ...body } as AgentRecord)
    return
  }
  await pg(`${TABLE}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function findAgent(id: string): Promise<AgentRecord | null> {
  if (!hasSupabase) {
    seed()
    return memory.get(id) ?? null
  }
  const rows = await pg<AgentRecord[]>(`${TABLE}?id=eq.${encodeURIComponent(id)}&limit=1`)
  return rows[0] ?? null
}

/** Loads an agent and asserts the caller owns it before anything else happens. */
export async function findOwnedAgent(id: string, ownerId: string): Promise<AgentRecord> {
  const row = await findAgent(id)
  // Same response for missing and not-owned so ids cannot be probed.
  if (!row || row.owner_id !== ownerId) throw new HttpError('Agent not found', 404)
  return row
}

export async function listPublished(limit = 48): Promise<AgentRecord[]> {
  if (!hasSupabase) {
    seed()
    return [...memory.values()]
      .filter((a) => a.status === 'published' || a.status === 'building')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
  }
  return pg<AgentRecord[]>(
    `${TABLE}?status=in.(published,building)&order=created_at.desc&limit=${limit}`,
  )
}

export async function listByOwner(ownerId: string, limit = 48): Promise<AgentRecord[]> {
  if (!hasSupabase) {
    seed()
    return [...memory.values()]
      .filter((a) => a.owner_id === ownerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
  }
  return pg<AgentRecord[]>(
    `${TABLE}?owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc&limit=${limit}`,
  )
}
