import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

type Handler = (req: Request) => Promise<Response>

/** Maps a request path to the api/ module that serves it. */
function resolveApiModule(pathname: string): string | null {
  if (pathname === '/api/agents') return './api/agents/index.ts'
  if (pathname.startsWith('/api/agents/')) return './api/agents/[id].ts'
  if (pathname === '/api/builder/build') return './api/builder/build.ts'
  if (pathname === '/api/builder/status') return './api/builder/status.ts'
  if (pathname === '/api/preview') return './api/preview.ts'
  return null
}

async function toWebRequest(req: IncomingMessage, origin: string): Promise<Request> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  return new Request(new URL(req.url ?? '/', origin), {
    method: req.method,
    headers,
    body: body && body.length ? body : undefined,
  })
}

/**
 * Runs the api/ handlers inside the Vite dev server so `npm run dev` behaves
 * like the deployed Vercel functions.
 */
function devApi(): Plugin {
  return {
    name: 'agents-in-the-wild-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const pathname = (req.url ?? '/').split('?')[0]
        const modulePath = resolveApiModule(pathname)
        if (!modulePath) return next()

        try {
          const mod = (await server.ssrLoadModule(modulePath)) as { default: Handler }
          const request = await toWebRequest(req, 'http://localhost:5173')
          const response = await mod.default(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          server.config.logger.error(`[dev-api] ${pathname} failed: ${String(err)}`)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'An unknown error occurred' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApi()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
})
