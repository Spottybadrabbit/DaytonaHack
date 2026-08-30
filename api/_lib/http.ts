export const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extraHeaders } })
}

export function fail(message: string, status: number): Response {
  return json({ error: message }, status)
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function toResponse(err: unknown): Response {
  if (err instanceof HttpError) return fail(err.message, err.status)
  // Never leak internal errors (which may embed credentials) to the browser.
  console.error('[api] unhandled error', err)
  return fail('An unknown error occurred', 500)
}

export function requireMethod(req: Request, method: string): void {
  if (req.method !== method) throw new HttpError(`Method ${req.method} not allowed`, 405)
}

/** Reads a JSON body with a hard byte ceiling so a large payload cannot be used as a DoS. */
export async function readJson<T>(req: Request, maxBytes = 16_384): Promise<T> {
  const text = await req.text()
  if (text.length > maxBytes) throw new HttpError('Request body is too large', 413)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new HttpError('Request body must be valid JSON', 400)
  }
}
