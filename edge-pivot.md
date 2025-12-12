Edge Pivot — Supabase Edge Functions (final)
============================================

Brutal rating (1–10)
---------------------
6/10 — blueprint still leans on manual auth verification, lacks CI-ready secrets management, and depends on future docs/feature flags, so the plan only edges toward security/cost discipline rather than owning it.

Purpose (one line)
-------------------
Move SRS processing, progress writes, and OpenAI usage behind Supabase Edge Functions so secrets and heuristics live server-side while the client remains an optimistic, offline-friendly surface.

Concise post-mortem
-------------------
- **Root causes:** 1) Auth and secrets leaked to the browser so we had no server-side gatekeeping; 2) Dual SRS stacks and sync scripts introduced drift and brittle rollouts; 3) Vitest discovered Playwright/node_modules code, causing noise and masking real failures.
- **Hidden assumptions:** (1) Clerk tokens are safe without server verification; (2) Clients can safely dictate `pointsEarned` without server control; (3) OpenAI spend can be enforced purely client-side.
- **Duplicated efforts:** SRS logic lives in `src/services` and `api/review.ts` simultaneously, there are three queue/sync implementations touching the same tables, and docs spread deployment guidance across `README`, `DEPLOYMENT.md`, and multiple strategy docs.

Precise remediation (priority → owner → resources → rollback)
---------------------------------------
1. **P0 – Key rotation & secret entombment** (Ops/Dev, 0.5h): rotate Supabase/OpenAI/Clerk secrets, remove tracked `.env`, and push fresh values into secrets vaults. Rollback: re-enable previous secrets only under strict rollback review.
2. **P0 – Repo noise pruning** (Dev Lead, 0.5h): delete `.specstory`, `.cursor`, `.test-reports`, and ignored node_modules; update `.gitignore`. Rollback: restore from git history if absolutely required.
3. **P1 – Edge review + ai-proxy deployment** (Backend, 1–2d): deploy `functions/review` + `functions/ai-proxy`, wire `aiAdapter` and review flows behind `USE_EDGE_REVIEW`/`USE_EDGE_AI_PROXY`, and keep offline queue for replay. Rollback: set flags false & revert function versions.
4. **P1 – Cost + telemetry guardrails** (DevOps/QA, 1d): add `user_api_usage` caps + logging, tighten Vitest discovery, and add CI secret scans. Rollback: temporarily relax caps or rename telemetry table while debugging.
5. **P2 – Doc consolidation** (Tech Writer, 0.5d): update `README.md` to point to this plan, archive extra `.md` files in `docs/archive/`, and keep canonical setup instructions minimal. Rollback: re-link archived docs if needed.

First-principles, high-leverage interventions
--------------------------------------------
1. **Single-source review path:** Route every review (online/offline replay) through `/functions/v1/review` so the server enforces RBAC, idempotency, and SRS calculation—this removes the need for multiple frontend sync scripts and eliminates drift.
2. **Edge AI proxy:** Replace direct OpenAI calls with `/functions/v1/ai-proxy` so only the server touches secrets and can cap usage; the smallest change is a flag-guarded `aiAdapter` that POSTs to the function.
3. **Parallelized rollout:** While backend teams ship the functions, Ops rotates secrets and QA tightens tests in parallel, maintaining momentum without blocking dependent workstreams.
4. **Test surface lock:** Narrow Vitest discovery, alias server-only modules to mocks, and move Playwright tests to dedicated CI jobs—this ensures the functions can be introduced with minimal noise.

Endpoints to finalize (running skeletons exist already)
----------------------------------------------------------------
### POST /functions/v1/review
- Payload: `{ userId: uuid, cardId: uuid, quality: 0-5, timeSpent: ms, correct: bool, pointsEarned: number, reviewId?: uuid }`.
- Auth: validate `Authorization: Bearer <token>` (Clerk JWKS or header fallback during rollout).
- Flow: fetch `srs_data`, run `srsEngine.processReview`, upsert SRS + `user_progress` with `onConflict`, and return `srsData`, `points`, `mastery`.
- Idempotency: honor `reviewId` in `srs_data` or `processed_reviews` so duplicate submissions are ignored.

### POST /functions/v1/ai-proxy
- Payload: OpenAI-style request (model, messages, optional temperature/max_tokens).
- Auth + guardrail: same Clerk verification + monthly cap against `user_api_usage`.
- Flow: call OpenAI via `OPENAI_API_KEY`, persist tokens used, return trimmed `choices` + usage, block at 429 when over cap.

Deployment & testing
--------------------
- Deploy via `supabase functions deploy review --project <ref>` and `supabase functions deploy ai-proxy --project <ref>`.
- Sync secrets using `supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..." OPENAI_API_KEY="..." CLERK_JWKS_URL="..."`.
- Tests:
  1) Unit tests per function (auth rejection, RBAC mismatch, idempotency, cap enforcement).
  2) Integration: offline queue replay + `srs_data`/`user_progress` verification.
  3) Smoke: staging review + AI call confirm Supabase rows + usage entries.
- Observability: log review processing duration/points and token usage per user; metric 5xx rate.

PIE / ICE ranking
----------------
1. Remove tracked secrets: PIE 10 / ICE 10
2. Single-edge review function: PIE 9 / ICE 9
3. Edge ai-proxy cap: PIE 8 / ICE 8
4. Repo noise pruning: PIE 8 / ICE 9
5. Test surface reduction: PIE 6 / ICE 6
6. Docs consolidation: PIE 5 / ICE 5

Acceptance SLOs
---------------
1. **Security:** `git grep -I "OPENAI_API_KEY"` & `SUPABASE_SERVICE_ROLE_KEY` return nothing; CI secret scan green.
2. **Functionality:** `POST /functions/v1/review` in staging returns 200 and updates `srs_data` + `user_progress` for sample inputs.
3. **Cost control:** `ai-proxy` returns HTTP 429 when `user_api_usage.tokens_used` ≥ cap in unit + integration tests.
4. **Reliability:** targeted `npx vitest run` completes < 2 minutes; Playwright routes run only in CI e2e job.
5. **Docs:** README and ENV guides point to this file; other `.md` files archived or deleted.

One-sentence justification
-------------------------
Centralizing privileged review and AI calls behind Supabase Edge Functions with feature-flagged fallbacks eliminates client-side secret leakage, enforces RBAC/cost controls, and narrows the deployment surface so we can ship securely and quickly.Edge Pivot — Supabase Edge Functions (surgical plan)
===============================================

Purpose (one line)
-------------------
Move authoritative backend responsibilities (SRS processing, progress upserts, AI proxying and cost enforcement, RBAC) into Supabase Edge Functions so the client is thin/offline-capable and no secrets are exposed in browser builds.

Core Premise (brief)
--------------------
- Supabase Edge Functions run server-side (Deno) with secrets stored in the Supabase project. They can use the Supabase service-role key to perform privileged upserts atomically and call external services (OpenAI) without exposing keys.
- Make `/functions/v1/review` the single source of truth for SRS processing and progress updates. Make `/functions/v1/ai-proxy` the only server-side path that calls OpenAI and records usage.

High-level benefits
-------------------
- Security: no OpenAI or service-role keys in frontend bundles.
- Cost control: per-user spend can be enforced server-side before API calls.
- Single authoritative SRS: avoids client/server drift and race conditions.
- Observability: central logs/metrics for review writes and AI usage.

Constraints and caveats
----------------------
- Deno runtime differences: no Node built-ins; use Deno-compatible libs or plain fetch.
- Clerk verification: Edge Functions must verify user auth (Clerk/JWT) — either via Clerk server SDK or by validating JWTs with JWKS.
- Stateless functions: long-running tasks must be handled outside or via job queue.

Endpoints to create
-------------------
1) `POST /functions/v1/review`
   - Accepts a Review payload (see schema below).
   - Auth: Validate Authorization: Bearer <token> -> extract userId.
   - Validate body; enforce request.userId === auth.userId (RBAC).
   - Fetch existing SRS (select), compute with server SRS engine, upsert into `srs_data`, upsert `user_progress` (atomic client transaction if available; otherwise use deterministic idempotent upserts with `onConflict`).
   - Return normalized ReviewResponse.

2) `POST /functions/v1/ai-proxy`
   - Accepts an OpenAI style request (validated).
   - Auth: Validate token -> userId.
   - Check persisted `user_api_usage` (or similar) against per-user cap.
   - If allowed, call OpenAI with `OPENAI_API_KEY` (stored as supabase secret), persist usage record after call, and return safe response (do not forward raw secrets).

Exact env / secret names (store in Supabase project secrets)
---------------------------------------------------------
- `SUPABASE_URL` (public)
- `SUPABASE_SERVICE_ROLE_KEY` (secret — used by Edge Functions)
- `OPENAI_API_KEY` (secret)
- `CLERK_JWKS_URL` or `CLERK_API_KEY` (secret) — whichever means you use to validate Clerk tokens server-side

Review payload schema (server-side expected)
-------------------------------------------
{ "userId": "<uuid>",
  "cardId": "<uuid>",
  "quality": <0-5 int>,
  "timeSpent": <ms int>,
  "correct": <bool>,
  "pointsEarned": <int>,
  "reviewId": "<optional uuid for idempotency>"
}

Server-side idempotency and dedupe
----------------------------------
- Use `reviewId` as idempotency key. When applying upserts, include `review_id` in the `srs_data` row or maintain a `processed_reviews` table to skip repeat processing.

Minimal Edge Function skeleton (TypeScript / Deno-compatible) — review
---------------------------------------------------------------------
// file: functions/review/index.ts
export default async function (req: Request) {
  // 1. auth: parse Authorization header and verify via Clerk or JWT
  // 2. parse JSON body and validate schema (e.g. zod)
  // 3. if body.userId !== auth.userId -> return 403
  // 4. supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  // 5. fetch existing srs row from srs_data where user_id/card_id
  // 6. compute updatedSrs = srsEngine.processReview(startingSrs, reviewResult)
  // 7. upsert srs_data with updatedSrs (onConflict user_id,card_id)
  // 8. upsert user_progress with incremented points
  // 9. return { srsData: updatedSrs, points: newTotal, mastery }
}

Minimal Edge Function skeleton — ai-proxy
----------------------------------------
// file: functions/ai-proxy/index.ts
export default async function (req: Request) {
  // 1. auth: verify token -> userId
  // 2. parse & validate request
  // 3. check usage: SELECT sum(cost) FROM user_api_usage WHERE user_id = ? AND period = current_month
  // 4. if over cap -> return 429
  // 5. call OpenAI via fetch with Authorization: Bearer OPENAI_API_KEY
  // 6. after success, upsert user_api_usage record (atomic-ish)
  // 7. return the normalized response (choices/usage trimmed)
}

Deployment commands (example)
-----------------------------
1. Build and deploy (from project root):
   - `supabase functions deploy review --project <ref>`
   - `supabase functions deploy ai-proxy --project <ref>`

2. Set secrets in Supabase (one-time / when rotating):
   - `supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<value>" OPENAI_API_KEY="<value>" CLERK_JWKS_URL="<value>"`

Client changes (very small)
---------------------------
- Replace any direct OpenAI usage with POST to `/functions/v1/ai-proxy`.
- Replace any client SRS computation that writes data with POST to `/functions/v1/review` and apply the returned SRS for optimistic UI.
- Keep the offline queue: when offline, queue review objects (including reviewId); when online, POST queued items to the review function and use server response to reconcile.

Testing (surgical)
------------------
1. Unit tests for each function verifying:
   - auth rejection for missing/invalid token
   - RBAC rejection when userId mismatch
   - idempotency by sending same `reviewId` twice
   - cost-cap blocking in `ai-proxy`
2. Integration tests (local supabase emulator or staging):
   - a smoke test that posts a review and verifies `srs_data` and `user_progress` rows
   - a flow that simulates queued items uploaded after reconnect

Observability and metrics
-------------------------
- Log: review processed, authUserId, cardId, points, duration.
- Metrics: per-user OpenAI tokens consumed (persist to `user_api_usage`), function latency, 5xx rate.

Rollback strategy
-----------------
1. Feature toggle: add a client-side flag `USE_EDGE_REVIEW=true|false` to switch between old behavior and Edge Functions. Use the flag to roll back quickly.
2. If deployment causes issues, revert function to previous version (Supabase supports function versions) or set `USE_EDGE_REVIEW=false` and roll forward fix.

Ownership, priority and timeline (surgical)
-----------------------------------------
- P0 (Immediate): Rotate any exposed keys and confirm `.env` not committed (owner: Ops/Dev, 0.5h)
- P1 (Edge pivot): Implement `review` & `ai-proxy` functions, set secrets, run tests, and update client (owner: Backend, 1-2 days)
- P2 (Harden): Add monitoring, CI secret scanning, idempotency tests (owner: DevOps/QA, 0.5-1 day)

Acceptance criteria / SLOs
-------------------------
- Security: No OpenAI or service-role key present in frontend bundles or repo (git grep returns nothing) — Accept when CI secret scanning passes.
- Functionality: `POST /functions/v1/review` returns 200 and persists `srs_data` and `user_progress` in staging (smoke test green).
- Cost control: `ai-proxy` returns 429 when user usage exceeds cap (verified by unit test).

One-sentence justification
--------------------------
Centralizing authority and secrets into Supabase Edge Functions immediately removes client-side risk, enforces server-side RBAC and cost controls, and simplifies long-term maintenance while keeping the client lightweight and offline-friendly.
