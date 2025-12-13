**Edge Functions — Cloudflare Workers**

Purpose
- This document is the single source of truth for our edge functions that we deploy as Cloudflare Workers. It unifies architecture, security, observability, and deployment guidance so engineers can author, test, and ship Workers reliably.

When to implement at the edge
- Low-latency request transforms (geographic routing, minor auth checks, short-lived token validation).
- Request-level business logic that must run close to the user (lightweight DB lookups, rate-limiting, short-lived caching, API proxying).
- NOT for long-running jobs, heavy CPU-bound processing, or tasks requiring local filesystem access.

Cloudflare Workers runtime constraints (practical guidance)
- No Node.js builtins (no `fs`, `net`, native modules). Use the Web Platform APIs: `fetch`, `Cache`, `crypto.subtle`, Streams.
- Bindings: Workers can access secrets/env vars, KV, R2, Durable Objects, and named secrets via Wrangler or the Cloudflare dashboard. Declare them in `wrangler.toml`.
- Recommended design: keep each Worker single-purpose and small (<200–500ms total runtime for typical requests). For heavier state needs, use Durable Objects or R2.

Security & secrets
- Use Cloudflare Secrets (bindings) or Wrangler secret storage for `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_JWKS_URL` etc. Never embed keys in source control.
- Verify inbound tokens with JWKS via Web Crypto (no server-side `jose` required). Always check token `iss`, `exp`, and `sub` match expected values.
- Enforce least privilege: use service-role keys only where server-side writes are required; for read-only paths, use client-scoped tokens or proxy with strict ACLs.

Authentication example (verify RS256 JWT via JWKS + Web Crypto)
```ts
async function fetchJwks(url: string) {
	const res = await fetch(url);
	return res.json();
}

async function verifyJwt(jwt: string, jwksUrl: string) {
	// Split token
	const [headerB64, payloadB64, sigB64] = jwt.split('.');
	const header = JSON.parse(atob(headerB64));
	const kid = header.kid;
	const jwks = await fetchJwks(jwksUrl);
	const key = jwks.keys.find((k: any) => k.kid === kid);
	if (!key) throw new Error('Unknown kid');
	// Build a CryptoKey for verification (RS256)
	const spki = jwkToSpki(key); // small helper to convert JWK -> spki
	const cryptoKey = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
	const data = new TextEncoder().encode(headerB64 + '.' + payloadB64);
	const signature = base64UrlToUint8Array(sigB64);
	const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, data);
	if (!ok) throw new Error('Invalid signature');
	return JSON.parse(atob(payloadB64));
}
```

Recommended bindings (wrangler)
- `kv_namespaces` for low-cost, eventually consistent counters and short caches.
- `r2_buckets` for large-object storage (images, blobs).
- `durable_objects` for strong-consistency per-entity state (locks, per-user sessions, rate-limit counters needing consistent increments).
- `vars` / `secrets` for runtime configuration keys.

Example `wrangler.toml` snippet
```toml
name = "gulfara-edge"
main = "src/index.ts"

[vars]
SUPABASE_URL = "https://..."
CLERK_JWKS_URL = "https://.../.well-known/jwks.json"

[triggers]

[[kv_namespaces]]
binding = "USAGE_KV"
id = "..."

[[r2_buckets]]
binding = "ARTIFACTS"
bucket_name = "gulfara-artifacts"

[[durable_objects]]
name = "RATE_LIMITER"
class_name = "RateLimiterDO"
```

Core patterns (clear, copyable)
- Validate and parse: verify auth first, then parse the body. Fail fast with 401/400.
- Idempotency: use deterministic ids for operations the client may retry (e.g., `reviewId`).
- Observability: emit structured `console.log(JSON.stringify({event, level, meta}))` for important events and errors.
- Caching: use the Cache API for GETs; use short TTLs and stale-while-revalidate when possible.
- Retries: avoid automatic retries for non-idempotent operations; if network calls need retry, keep a bounded backoff.

Example Worker: `review` (simplified)
```ts
export default {
	async fetch(request: Request, env: Env) {
		try {
			if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
			const auth = request.headers.get('Authorization')?.split(' ')[1];
			if (!auth) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 });
			const payload = await verifyJwt(auth, env.CLERK_JWKS_URL);
			const body = await request.json();
			if (payload.sub !== body.userId) return new Response(JSON.stringify({ error: 'invalid-sub' }), { status: 403 });

			// Example: call Supabase REST (or use fetch to Supabase with service role key)
			const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/srs_data`, {
				method: 'POST',
				headers: { 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
				body: JSON.stringify({ /* srs update payload */ }),
			});
			const result = await resp.json();
			return new Response(JSON.stringify({ ok: true, result }), { headers: { 'Content-Type': 'application/json' } });
		} catch (err) {
			console.error('review:error', err);
			return new Response(JSON.stringify({ error: err.message || 'internal' }), { status: 500 });
		}
	}
}
```

Example Worker: `ai-proxy` (simplified, with usage check)
```ts
export default {
	async fetch(request: Request, env: Env) {
		const auth = request.headers.get('Authorization')?.split(' ')[1];
		if (!auth) return new Response('Unauthorized', { status: 401 });
		const payload = await verifyJwt(auth, env.CLERK_JWKS_URL);
		const body = await request.json();
		// Check usage in KV (very small example)
		const key = `usage:${payload.sub}:${new Date().toISOString().slice(0,7)}`;
		const usageStr = await env.USAGE_KV.get(key);
		const usage = usageStr ? JSON.parse(usageStr) : { tokens: 0, cost: 0 };
		if (usage.cost > Number(env.OPENAI_USER_MONTHLY_CAP || 0)) {
			return new Response(JSON.stringify({ error: 'monthly_cap_reached' }), { status: 402 });
		}
		// Forward to OpenAI
		const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ model: body.model || 'gpt-4o-mini', messages: body.messages, temperature: 0.2 }),
		});
		const openaiJson = await openaiResp.json();
		// Update usage asynchronously (best-effort)
		try {
			usage.tokens += openaiJson.usage?.total_tokens || 0;
			usage.cost += estimateCost(openaiJson.usage);
			await env.USAGE_KV.put(key, JSON.stringify(usage));
		} catch (e) { console.warn('usage:update_failed', e); }
		return new Response(JSON.stringify(openaiJson), { headers: { 'Content-Type': 'application/json' } });
	}
}
```

Local development & testing
- Use Miniflare or `wrangler dev` for quick iteration. Miniflare supports mocks for KV, Durable Objects, and R2 for unit testing.
- Keep test vectors for JWTs (short-lived fixtures) and a small seed for KV to validate usage logic.

CI / Deployment (GitHub Actions example)
```yaml
name: deploy-worker
on: [push]
jobs:
	deploy:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v4
			- uses: cloudflare/wrangler-action@2
				with:
					apiToken: ${{ secrets.CF_API_TOKEN }}
					environment: production
					workingDirectory: ./gulfara
```

Observability & error handling
- Use structured logs with `console.log`/`console.error`. For long-term analysis, use Cloudflare Logpush or a third-party provider.
- Return consistent error shapes: `{ error: string, code?: string, details?: object }` so frontends handle errors predictably.

Performance & cost tips
- Keep network round-trips minimal. Bundle multiple small DB reads into one batched request when possible.
- Prefer KV for counters and short caches; use Durable Objects for strongly consistent per-entity state.
- Avoid large serial JSON transforms in the hot-path; consider streaming responses for large payloads.

Checklist before production deploy
- [ ] Add required secrets and bindings in Cloudflare (or `wrangler secret put` / dashboard).
- [ ] Validate JWT verification against a real JWKS URL in staging.
- [ ] Smoke-test flows with `wrangler dev` or Miniflare, including token expiry, unauthorized paths, and usage caps.
- [ ] Deploy via GitHub Actions or `wrangler publish` to a staging environment and test end-to-end.

FAQ — quick answers
- Where to store service keys? Use Cloudflare secrets / bindings — never commit keys.
- What about long jobs? Offload to background jobs (Cloudflare Workers Queues or an external job processor).
- Can I stream audio or large files? Use R2 for storage and streaming responses; avoid buffering entire large objects in-memory.

Next steps
- I updated the canonical document to focus on Cloudflare Workers and provided copy-pasteable examples, `wrangler.toml` guidance, and a GitHub Actions snippet. If you want, I can:
	- Add a `Miniflare` test harness and a small example repo under `gulfara/functions/` to validate these Workers locally.
	- Convert the simplified `verifyJwt` helper into a production-ready utility and add unit tests.

**15-Minute Function Factory**

- Purpose: ship a minimal Firebase function in ~15 minutes to remove an urgent user blocker with a kill switch and simple logging.

Plan (15-mins)
- 9:00 — Identify #1 user blocker in Firebase
- 9:05 — Start timer, build minimal function
- 9:15 — Deploy with kill switch (ENABLED=false)
- 9:16 — Test integration with frontend
- 9:20 — Enable function (ENABLED=true)
- 9:21 — Monitor `blocked_actions` count

Automated Priority Flywheel

USER BLOCKER → LOGGED → FUNCTION BUILT → BLOCKER REMOVED
			↑                                            ↓
			└───────────────────FEEDBACK─────────────────┘

Three-Tier Success Metrics

TIER 1: FUNCTION SHIPPED (15 minutes)
TIER 2: USER BLOCKER REDUCED (1 hour)
TIER 3: NO NEW WORKAROUNDS CREATED (24 hours)

Phase 0: Ignition (Today, 30 Minutes)

1. Create Firestore collection: `blocked_actions` (writes auto-create the collection).
2. Add 3-line logger to frontend workarounds.
3. Deploy hello-world function with kill switch.
4. Test: `curl` → response → flip switch → test again.

Frontend 3-line logger (example)
```javascript
export const logBlockedAction = (action, details = {}) =>
	fetch(process.env.REACT_APP_LOG_URL || '/.netlify/functions/logBlocked', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action, details, ts: Date.now() })
	}).catch(() => {});
```

Firebase functions (hello-world + logBlocked) — intent

- `helloWorld`: checks Firestore `kill_switch/helloWorld.enabled` and returns 503 when disabled (no redeploy required to turn on/off).
- `logBlocked`: lightweight endpoint that writes a record to `blocked_actions` with a server timestamp.

Quick local test & deploy commands (Windows)
```powershell
cd C:\Users\muzam\Projects\Gulfara\functions
npm run build
# Start emulator (functions + firestore)
npx firebase emulators:start --only functions,firestore
# Deploy functions to Firebase (only when ready)
npx firebase deploy --only functions:helloWorld,functions:logBlocked
```

Flip kill switch (Firestore console)
- Create or update document `kill_switch/helloWorld` with field `enabled = true|false` to enable/disable instantly.

Test via emulator (example)
```bash
curl -X GET "http://localhost:5001/YOUR_PROJECT_ID/us-central1/helloWorld"
curl -X POST "http://localhost:5001/YOUR_PROJECT_ID/us-central1/logBlocked" -H "Content-Type: application/json" -d '{"action":"checkout_error","details":{"step":2}}'
```

