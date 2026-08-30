import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ClerkProvider,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useClerk,
} from '@clerk/clerk-react'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

/** True when the app runs without Clerk keys — local field-lab mode. */
export const isDemoAuth = !CLERK_KEY

export interface Session {
  isLoaded: boolean
  isSignedIn: boolean
  userId: string | null
  displayName: string | null
  getToken: () => Promise<string | null>
  signIn: (name?: string) => void
  signOut: () => void
}

const SessionContext = createContext<Session | null>(null)

const DEMO_KEY = 'aitw.demo-session'

function useDemoSession(): Session {
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DEMO_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { userId: string; displayName: string }
        setUserId(parsed.userId)
        setDisplayName(parsed.displayName)
      }
    } catch {
      // A corrupt local session is not worth surfacing; start signed out.
    }
    setIsLoaded(true)
  }, [])

  const signIn = useCallback((name?: string) => {
    const displayed = (name ?? 'Field Researcher').slice(0, 40)
    const id = `demo_${displayed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    window.localStorage.setItem(DEMO_KEY, JSON.stringify({ userId: id, displayName: displayed }))
    setUserId(id)
    setDisplayName(displayed)
  }, [])

  const signOut = useCallback(() => {
    window.localStorage.removeItem(DEMO_KEY)
    setUserId(null)
    setDisplayName(null)
  }, [])

  const getToken = useCallback(async () => (userId ? `demo:${userId}` : null), [userId])

  return useMemo(
    () => ({ isLoaded, isSignedIn: !!userId, userId, displayName, getToken, signIn, signOut }),
    [isLoaded, userId, displayName, getToken, signIn, signOut],
  )
}

function DemoBridge({ children }: { children: ReactNode }) {
  const session = useDemoSession()
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useClerkAuth()
  const { user } = useClerkUser()
  const clerk = useClerk()

  const session = useMemo<Session>(
    () => ({
      isLoaded,
      isSignedIn: !!isSignedIn,
      userId: userId ?? null,
      displayName: user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? null,
      getToken: () => getToken(),
      signIn: () => clerk.openSignIn(),
      signOut: () => void clerk.signOut(),
    }),
    [isLoaded, isSignedIn, userId, user, getToken, clerk],
  )

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!CLERK_KEY) return <DemoBridge>{children}</DemoBridge>
  return (
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/">
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  )
}

export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <AuthProvider>')
  return ctx
}
