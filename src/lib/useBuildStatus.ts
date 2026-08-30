import { useEffect, useRef, useState } from 'react'
import { getBuildStatus } from './api'
import { useSession } from './auth'
import type { BuildStatus } from './types'

const POLL_MS = 2000

/**
 * Polls the authenticated build-status endpoint. Because the sandbox command id
 * lives on the owned Supabase agent, this resumes correctly after navigation.
 */
export function useBuildStatus(agentId: string | null) {
  const { getToken, isSignedIn } = useSession()
  const [status, setStatus] = useState<BuildStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stopped = useRef(false)

  useEffect(() => {
    if (!agentId || !isSignedIn) return
    stopped.current = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      try {
        const next = await getBuildStatus(agentId, getToken)
        if (stopped.current) return
        setStatus(next)
        setError(null)
        if (next.finished) return
      } catch (err) {
        if (stopped.current) return
        setError(err instanceof Error ? err.message : 'Failed to read the build status.')
      }
      if (!stopped.current) timer = setTimeout(tick, POLL_MS)
    }

    void tick()
    return () => {
      stopped.current = true
      if (timer) clearTimeout(timer)
    }
  }, [agentId, isSignedIn, getToken])

  return { status, error }
}
