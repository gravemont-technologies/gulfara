import http from 'http'
import { reviewHandler } from '../api/review'
import aiProxyHandler from '../api/ai-proxy'
import syncHandler from '../api/sync'

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
    if (req.url?.startsWith('/api/review')) {
      response = await reviewHandler(request)
    } else if (req.url?.startsWith('/api/ai-proxy')) {
      response = await aiProxyHandler(request)
    } else if (req.url?.startsWith('/api/sync')) {
      response = await syncHandler(request)
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
