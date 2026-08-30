import { useEffect, useRef } from 'react'
import type { BuildStatus } from '@/lib/types'
import { Spinner } from './ui'

export function BuildConsole({ status, error }: { status: BuildStatus | null; error: string | null }) {
  const scroller = useRef<HTMLDivElement>(null)
  const lineCount = status?.logs.length ?? 0

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lineCount])

  const progress = status?.progress ?? 0

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
        <span className="eyebrow">Live build output</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {status?.finished ? 'complete' : <>{<Spinner className="mr-1.5 align-[-2px]" />}running</>}
        </span>
      </div>

      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-wild transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div ref={scroller} className="max-h-[340px] overflow-y-auto px-4 py-3 font-mono text-[12px] leading-6">
        {lineCount === 0 ? (
          <p className="text-muted-foreground">Claude Code is working inside a fresh Daytona sandbox…</p>
        ) : (
          status?.logs.map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`} className="flex gap-3">
              <span className="select-none text-muted-foreground/50">{String(i + 1).padStart(2, '0')}</span>
              <span className="whitespace-pre-wrap break-words text-foreground/90">{line}</span>
            </div>
          ))
        )}
        {error ? <div className="mt-2 text-destructive">{error}</div> : null}
        {status?.errorMessage ? <div className="mt-2 text-destructive">{status.errorMessage}</div> : null}
      </div>
    </div>
  )
}
