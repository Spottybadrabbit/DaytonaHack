import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AgentCard } from '@/components/AgentCard'
import { Button, EmptyState, TextInput } from '@/components/ui'
import { listWildAgents } from '@/lib/api'
import { SPECIES, type PublicAgent } from '@/lib/types'

export function Marketplace() {
  const [agents, setAgents] = useState<PublicAgent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [species, setSpecies] = useState('all')

  useEffect(() => {
    let cancelled = false
    listWildAgents()
      .then((res) => {
        if (!cancelled) setAgents(res.agents)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The creature slipped away')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(() => {
    if (!agents) return []
    const q = query.trim().toLowerCase()
    return agents.filter((a) => {
      const speciesOk = species === 'all' || a.species === species
      const queryOk = !q || a.name.toLowerCase().includes(q) || a.brief.toLowerCase().includes(q)
      return speciesOk && queryOk
    })
  }, [agents, query, species])

  return (
    <div className="container-wild py-16">
      <p className="eyebrow">The Wilds</p>
      <h1 className="mt-4 font-display text-4xl sm:text-5xl">Recent sightings in the wild</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Wander in. Every creature here was raised in the field lab and published from its own Daytona sandbox.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Track by name or brief…"
          className="sm:max-w-xs"
        />
        <select
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          className="rounded border border-border bg-background/70 px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none sm:w-48"
        >
          <option value="all">Every species</option>
          {SPECIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8">
        {error ? (
          <EmptyState title="The creature slipped away" body={error} />
        ) : !agents ? (
          <p className="font-mono text-sm text-muted-foreground">Reading the field guide…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            title="The trail has gone cold"
            body="No creatures match your tracks. Clear the trail and look again, or raise one yourself."
            action={
              <Link to="/field-lab">
                <Button className="mt-2">Raise something wild</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
