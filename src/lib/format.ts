export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'unknown'
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'building':
      return 'Out hunting'
    case 'published':
      return 'Released'
    case 'error':
      return 'Slipped away'
    default:
      return 'Idle'
  }
}

export function statusTone(status: string): string {
  switch (status) {
    case 'building':
      return 'text-wild border-wild/40 bg-wild/10'
    case 'published':
      return 'text-foreground border-border bg-muted/60'
    case 'error':
      return 'text-destructive border-destructive/40 bg-destructive/10'
    default:
      return 'text-muted-foreground border-border bg-muted/40'
  }
}
