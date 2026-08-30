import { Link } from 'react-router-dom'
import type { PublicAgent } from '@/lib/types'
import { relativeTime, statusLabel, statusTone } from '@/lib/format'
import { Badge, Spinner } from './ui'

export function AgentCard({ agent }: { agent: PublicAgent }) {
  return (
    <Link
      to={`/agents/${agent.id}`}
      className="panel group flex flex-col gap-4 p-5 transition-colors hover:border-foreground/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl leading-tight">{agent.name}</h3>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {agent.species} · {agent.habitat}
          </p>
        </div>
        <Badge className={statusTone(agent.status)}>
          {agent.status === 'building' ? <Spinner /> : null}
          {statusLabel(agent.status)}
        </Badge>
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{agent.brief}</p>

      <div className="hairline" />

      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>{agent.hunts} hunts</span>
        <span>{relativeTime(agent.createdAt)}</span>
      </div>
    </Link>
  )
}
