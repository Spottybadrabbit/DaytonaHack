import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env, hasClerk } from './env.ts'
import { HttpError } from './http.ts'

export interface Principal {
  userId: string
  /** true when the caller was verified by Clerk rather than field-lab mode. */
  verified: boolean
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    const url = env.clerkJwksUrl ?? `${env.clerkIssuer}/.well-known/jwks.json`
    jwks = createRemoteJWKSet(new URL(url))
  }
  return jwks
}

function bearer(req: Request): string {
  const header = req.headers.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new HttpError('Sign in to start or inspect a build', 401)
  }
  return token
}

/**
 * Verifies the caller. Every builder request goes through here before Supabase
 * ownership is checked and long before Daytona is touched.
 */
export async function requirePrincipal(req: Request): Promise<Principal> {
  const token = bearer(req)

  if (!hasClerk) {
    // Field-lab mode: no Clerk keys are configured, so accept the local
    // `demo:<id>` session token. This never runs when CLERK_JWT_ISSUER is set.
    if (!token.startsWith('demo:')) throw new HttpError('Sign in to start or inspect a build', 401)
    const userId = token.slice('demo:'.length)
    if (!/^demo_[a-z0-9-]{1,64}$/.test(userId)) throw new HttpError('Invalid session', 401)
    return { userId, verified: false }
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: env.clerkIssuer,
    })
    const userId = typeof payload.sub === 'string' ? payload.sub : null
    if (!userId) throw new HttpError('Invalid session', 401)
    return { userId, verified: true }
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError('Session could not be verified', 401)
  }
}
