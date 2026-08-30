declare const process: { env: Record<string, string | undefined> }

function read(name: string): string | undefined {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

export const env = {
  clerkIssuer: read('CLERK_JWT_ISSUER'),
  clerkJwksUrl: read('CLERK_JWKS_URL'),
  supabaseUrl: read('SUPABASE_URL'),
  supabaseServiceKey: read('SUPABASE_SERVICE_ROLE_KEY'),
  daytonaApiKey: read('DAYTONA_API_KEY'),
  daytonaApiUrl: read('DAYTONA_API_URL') ?? 'https://app.daytona.io/api',
  daytonaSnapshot: read('DAYTONA_SNAPSHOT') ?? 'daytonaio/sandbox:0.4.3',
  anthropicApiKey: read('ANTHROPIC_API_KEY'),
  previewPort: Number(read('PREVIEW_PORT') ?? '3000'),
}

/** Clerk is optional locally; without it the API runs in field-lab mode. */
export const hasClerk = Boolean(env.clerkIssuer || env.clerkJwksUrl)
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseServiceKey)
export const hasDaytona = Boolean(env.daytonaApiKey && env.anthropicApiKey)
