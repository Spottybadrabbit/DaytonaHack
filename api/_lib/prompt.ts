import { HttpError } from './http.ts'

/** Mirrors src/lib/types.ts. Keep both in sync. */
export const BRIEF_MAX_LENGTH = 2000
export const NAME_MAX_LENGTH = 60

const SPECIES = new Set(['Development', 'Research', 'Operations', 'Commerce', 'Support'])
const HABITATS = new Set(['Daytona habitat', 'The deep wilds', 'Coastal shelf', 'Canopy'])

export interface BuildBrief {
  name: string
  species: string
  habitat: string
  brief: string
}

function str(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new HttpError(`${field} must be a string`, 400)
  return value.trim()
}

/**
 * Validates and normalises the request body.
 *
 * The returned values are only ever written to a JSON file inside the sandbox
 * and read back by the runner as data. Nothing here is interpolated into a
 * shell command or into JavaScript source.
 */
export function parseBuildBrief(body: unknown): BuildBrief {
  if (!body || typeof body !== 'object') throw new HttpError('Request body must be an object', 400)
  const raw = body as Record<string, unknown>

  const name = str(raw.name, 'name')
  if (name.length < 2 || name.length > NAME_MAX_LENGTH) {
    throw new HttpError(`name must be between 2 and ${NAME_MAX_LENGTH} characters`, 400)
  }

  const brief = str(raw.brief, 'brief')
  if (brief.length < 20) throw new HttpError('brief must be at least 20 characters', 400)
  if (brief.length > BRIEF_MAX_LENGTH) {
    throw new HttpError(`brief must be at most ${BRIEF_MAX_LENGTH} characters`, 400)
  }

  const species = str(raw.species, 'species')
  if (!SPECIES.has(species)) throw new HttpError('species is not a known species', 400)

  const habitat = str(raw.habitat, 'habitat')
  if (!HABITATS.has(habitat)) throw new HttpError('habitat is not a known habitat', 400)

  return { name, species, habitat, brief }
}

/** Encodes the brief as the JSON data file the runner reads. */
export function briefFile(brief: BuildBrief): string {
  return JSON.stringify({ name: brief.name, brief: brief.brief }, null, 2)
}
