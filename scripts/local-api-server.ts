import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// Programmatically register tsconfig path mappings so `@/` imports
// resolve correctly when running this script directly.
try {
  // locate tsconfig.json relative to this script
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const tsconfigPath = path.resolve(__dirname, '..', 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    let raw = fs.readFileSync(tsconfigPath, 'utf8')
    // tsconfig.json may contain comments (JSONC); strip simple comments before parsing
    raw = raw.replace(/\/\*[\s\S]*?\*\//g, '')
    raw = raw.replace(/\/\/.*$/gm, '')
    const tsconfig = JSON.parse(raw)
    const baseUrl = tsconfig.compilerOptions?.baseUrl ? path.resolve(__dirname, '..', tsconfig.compilerOptions.baseUrl) : path.resolve(__dirname, '..', 'src')
    const paths = tsconfig.compilerOptions?.paths ?? {}
    // Import and register
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { register } = await import('tsconfig-paths')
    register({ baseUrl, paths })
  }
} catch (err) {
  // ignore; will likely fail if tsconfig-paths isn't present
  // eslint-disable-next-line no-console
  console.warn('tsconfig-paths registration failed', String(err))
}

import http from 'http'
// For a resilient local test harness we avoid importing project handlers
// (which rely on path aliases and full runtime). Instead implement a
// minimal local-only handler that mirrors the core behavior needed for
// manual verification (validation + idempotent persistence).

const PORT = Number(process.env.LOCAL_API_PORT ?? 4000)

function getRawBody(req: http.IncomingMessage): Promise<Uint8Array | undefined> {
  return new Promise((resolve) => {
    const chunks: Uint8Array[] = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined))
    req.on('error', () => resolve(undefined))
  })
}

async function handler(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    const url = `http://localhost:${PORT}${req.url ?? ''}`
    const method = req.method ?? 'GET'
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue
      if (Array.isArray(v)) headers.set(k, v.join(','))
      else headers.set(k, v)
    }

    const rawBody = await getRawBody(req)
    const request = new Request(url, { method, headers, body: rawBody })

    let response: Response
    // Local in-memory persistence and simple handlers for manual testing
    const idempotency = (global as any).__local_api_idempotency__ ||= new Map<string, number>()
    const records = (global as any).__local_api_records__ ||= [] as Array<any>

    if (req.url?.startsWith('/api/review')) {
      // Minimal validation and idempotent points handling
      if (request.method !== 'POST') {
        response = new Response('Method Not Allowed', { status: 405 })
      } else {
        let body: any
        try {
          body = await request.json()
        } catch {
          response = new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
        }

        if (!response) {
          const userId = body.userId
          const cardId = body.cardId
          const points = Number(body.pointsEarned ?? 0)
          const requestId = request.headers.get('x-gulfara-request-id') ?? request.headers.get('x-request-id') ?? undefined

          if (!userId || !cardId) {
            response = new Response(JSON.stringify({ error: 'Invalid request payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
          } else {
            const key = requestId ? `${userId}_${requestId}` : undefined
            if (key && idempotency.has(key)) {
              const total = idempotency.get(key) as number
              response = new Response(JSON.stringify({ srsData: { userId, cardId }, points: total, mastery: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
            } else {
              const previous = records.filter(r => r.userId === userId && typeof r.points === 'number').slice(-1)[0]?.points ?? 0
              const next = previous + Math.max(points, 0)
              records.push({ userId, cardId, points: next, requestId })
              if (key) idempotency.set(key, next)
              response = new Response(JSON.stringify({ srsData: { userId, cardId }, points: next, mastery: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
            }
          }
        }
      }
    } else if (req.url?.startsWith('/api/ai-proxy')) {
      if (request.method !== 'POST') {
        response = new Response('Method Not Allowed', { status: 405 })
      } else {
        // Echo the request for local testing
        const payload = await request.text()
        response = new Response(JSON.stringify({ echo: payload }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
    } else if (req.url?.startsWith('/api/sync')) {
      response = new Response(JSON.stringify({ data: [], message: 'Sync endpoint stubbed during migration' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
      return
    }

    const body = await response.text()
    const outHeaders: Record<string, string> = {}
    response.headers.forEach((v, k) => (outHeaders[k] = v))
    res.writeHead(response.status, outHeaders)
    res.end(body)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: String(err) }))
  }
}

const server = http.createServer(handler)
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Local API server listening on http://localhost:${PORT}`)
})
