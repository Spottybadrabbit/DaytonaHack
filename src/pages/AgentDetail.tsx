import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BuildConsole } from '@/components/BuildConsole'
import { Badge, Button, EmptyState, Panel } from '@/components/ui'
import { getAgent } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { relativeTime, statusLabel, statusTone } from '@/lib/format'
import { useBuildStatus } from '@/lib/useBuildStatus'
import type { PublicAgent } from '@/lib/types'

export function AgentDetail() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { isSignedIn } = useSession()

  const [agent, setAgent] = useState<PublicAgent | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // The owner may watch the build; everyone else sees the public record only.
  const watching = isSignedIn && (params.get('watch') === '1' || agent?.status === 'building')
  const { status, error: statusError } = useBuildStatus(watching ? id : null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      getAgent(id)
        .then((res) => {
          if (!cancelled) setAgent(res.agent)
        })
        .catch((err: unknown) => {
          if (!cancelled) setLoadError(err instanceof Error ? err.message : 'The creature slipped away')
        })
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  // Refresh the public record once the build reports it is done.
  useEffect(() => {
    if (!status?.finished) return
    getAgent(id)
      .then((res) => setAgent(res.agent))
      .catch(() => undefined)
  }, [status?.finished, id])

  if (loadError) {
    return (
      <div className="container-wild py-24">
        <EmptyState
          title="The creature slipped away"
          body={loadError}
          action={
            <Link to="/marketplace">
              <Button className="mt-2">Back to the wilds</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (!agent) {
    return <p className="container-wild py-24 font-mono text-sm text-muted-foreground">Tracking…</p>
  }

  const liveStatus = status?.status ?? agent.status
  const previewUrl = status?.previewUrl ?? agent.previewUrl

  return (
    <div className="container-wild py-16">
      <Link to="/marketplace" className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
        ← The Wilds
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">{agent.name}</h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {agent.species} · Habitat: {agent.habitat} · sighted {relativeTime(agent.createdAt)}
          </p>
        </div>
        <Badge className={statusTone(liveStatus)}>{statusLabel(liveStatus)}</Badge>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Panel>
            <p className="eyebrow">Build brief</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {agent.brief}
            </p>
          </Panel>

          {watching ? <BuildConsole status={status} error={statusError} /> : null}

          {liveStatus === 'published' && previewUrl ? (
            <Panel className="space-y-3">
              <p className="eyebrow">Public preview</p>
              <p className="text-sm text-muted-foreground">
                Your app is public. Open it now or return to your roster.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={previewUrl} target="_blank" rel="noreferrer noopener">
                  <Button>Open app</Button>
                </a>
                <Link to="/dashboard">
                  <Button variant="outline">View dashboard</Button>
                </Link>
              </div>
              <p className="break-all font-mono text-[11px] text-muted-foreground">{previewUrl}</p>
            </Panel>
          ) : null}

          {liveStatus === 'building' && !watching ? (
            <Panel>
              <p className="text-sm text-muted-foreground">
                Your creature is out hunting… Claude Code is building this app in its Daytona sandbox. Sign in
                as the owner to watch the live build output.
              </p>
            </Panel>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Panel className="space-y-3">
            <p className="eyebrow">Field notes</p>
            <Row label="Hunts" value={String(agent.hunts)} />
            <Row label="Status" value={statusLabel(liveStatus)} />
            <Row label="Runtime" value="Claude Code · Daytona" />
            <Row label="Tools" value="Read / Write / Edit only" />
          </Panel>
          <Panel className="space-y-2">
            <p className="eyebrow">Isolation</p>
            <p className="text-sm text-muted-foreground">
              Bash, web access, subagents, and notebooks are explicitly denied. Only the preview port is
              public, and the sandbox is torn down after the demo window.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-[12px]">{value}</span>
    </div>
  )
}
