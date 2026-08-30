import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AgentCard } from '@/components/AgentCard'
import { Button, EmptyState, Panel } from '@/components/ui'
import { listMyAgents } from '@/lib/api'
import { useSession } from '@/lib/auth'
import type { OwnedAgent } from '@/lib/types'

const REFRESH_MS = 5000

export function Dashboard() {
  const { isLoaded, isSignedIn, signIn, getToken } = useSession()
  const [agents, setAgents] = useState<OwnedAgent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await listMyAgents(getToken)
      setAgents(res.agents)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your agents.")
    }
  }, [getToken])

  useEffect(() => {
    if (!isSignedIn) return
    void load()
    // Keep the roster live so a build that finishes elsewhere still lands here.
    const timer = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [isSignedIn, load])

  if (isLoaded && !isSignedIn) {
    return (
      <div className="container-wild py-24">
        <Panel className="mx-auto max-w-lg text-center">
          <h1 className="font-display text-3xl">Your roster is private</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in to see the agents you own and the builds still running.
          </p>
          <Button className="mt-6" onClick={() => signIn()}>
            Sign in
          </Button>
        </Panel>
      </div>
    )
  }

  const building = agents?.filter((a) => a.status === 'building').length ?? 0

  return (
    <div className="container-wild py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Deployed roster</p>
          <h1 className="mt-4 font-display text-4xl">Your wild things</h1>
        </div>
        <Link to="/field-lab">
          <Button>Raise something wild</Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="In the roster" value={agents?.length ?? '—'} />
        <Stat label="Out hunting" value={building} />
        <Stat
          label="Published"
          value={agents?.filter((a) => a.status === 'published').length ?? '—'}
        />
      </div>

      <div className="mt-10">
        {error ? (
          <EmptyState title="Couldn't load your agents" body={error} />
        ) : !agents ? (
          <p className="font-mono text-sm text-muted-foreground">Checking the roster…</p>
        ) : agents.length === 0 ? (
          <EmptyState
            title="Empty roster"
            body="No agents yet. Name one, describe the app it should build, and release it."
            action={
              <Link to="/field-lab">
                <Button className="mt-2">Create your first agent</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Panel className="py-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </Panel>
  )
}
