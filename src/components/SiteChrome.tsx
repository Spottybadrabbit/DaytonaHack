import { NavLink, Link } from 'react-router-dom'
import { useSession, isDemoAuth } from '@/lib/auth'
import { Button, cx } from './ui'

const NAV = [
  { to: '/marketplace', label: 'The Wilds' },
  { to: '/field-lab', label: 'Field Lab' },
  { to: '/dashboard', label: 'Dashboard' },
]

export function SiteHeader() {
  const { isSignedIn, displayName, signIn, signOut } = useSession()

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container-wild flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-wild animate-pulseline" aria-hidden />
          <span className="font-display text-lg leading-none">Agents in the Wild</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  'rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors',
                  isActive ? 'bg-muted/70 text-foreground' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                {displayName ?? 'Researcher'}
              </span>
              <Button size="sm" variant="outline" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => signIn()}>
              Sign in
            </Button>
          )}
        </div>
      </div>
      {isDemoAuth ? (
        <div className="border-t border-border/60 bg-muted/40">
          <div className="container-wild py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Field-lab mode — no Clerk keys configured, builds run against the local simulator
          </div>
        </div>
      ) : null}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 py-10">
      <div className="container-wild flex flex-col items-start justify-between gap-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <span className="font-mono uppercase tracking-[0.2em]">Agents in the Wild — field guide up to date</span>
        <span>Claude Code · Daytona sandboxes · Supabase · Clerk</span>
      </div>
    </footer>
  )
}
