> **[ARCHIVED]**: Supabase Edge Function documentation (historical)
>
> These enhanced Edge Function docs describe Supabase-based edge routes that
> were used historically. The project now uses Firebase for persistence; keep
> these docs for audit only and avoid following them for current deployments.

# Edge Functions (Enhanced)

## Purpose
- Captures the production-ready Supabase Edge Functions that remain in use after the EDGIFY migration and on which the Vercel+Firebase build depends.
- Source code lives in `gulfara/functions/` and is published via `supabase functions deploy review` and `supabase functions deploy ai-proxy` (see `gulfara/edge-functions.md` for the full copy-paste-ready versions).
- These routes run in the Supabase/Deno edge runtime, so they avoid node-builtins such as `fs`/`path` and lean on Web Crypto for token verification, matching the EDGIFY constraint that every server-side hook stay lightweight and portable.

## Shared runtime requirements
| Secret | Purpose |
| --- | --- |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Service-role access to write `srs_data`, `user_progress`, and `user_api_usage` with Supabase's edge client. |
| `CLERK_JWKS_URL` | Remote JWKS used to validate Clerk-issued access tokens before any database writes occur. |
| `OPENAI_API_KEY` | Only required for `ai-proxy`; used when forwarding requests to OpenAI. |
| `OPENAI_USER_MONTHLY_CAP` | Configures the monthly spending ceiling enforced inside `ai-proxy`.

### Feature flags (frontend toggles)
- `VITE_USE_EDGE_REVIEW` – flips the dashboard to call the `review` edge route instead of the legacy Supabase client.
- `VITE_USE_EDGE_AI_PROXY` – gates the in-app OpenAI assists that route through `ai-proxy`.

## Function: `review` (`gulfara/functions/review/index.ts`)
- **Trigger**: POST with a Clerk JWT w/ `Bearer` prefix, payload matching the schema `{ userId, cardId, quality, timeSpent, correct, pointsEarned, reviewId? }`.
- **Auth**: A light Web Crypto JWKS verifier parses and validates the token (RS256 only) before enforcing `payload.sub === body.userId`. No external jose package is required, fulfilling EDGIFY's edge runtime constraints.
- **Workload**: Carefully reads or seeds the user/card row from `srs_data`, recalculates ease/interval/repetitions using the SM-2-ish algorithm in `functions/lib/srsEngine.ts`, upserts the result, and then optionally bumps `user_progress.points` when `pointsEarned > 0`.
- **Outputs**: Returns the new SRS slot (`ease`, `interval`, `nextReview`, `lastReview`) plus the earned points/mastery score; logs are bubbled through JSON responses and console errors for visibility.
- **Ship-ready notes**: Deploy by copying the reviewed `index.ts` into Supabase's `review` edge function, ensure `jsonHeaders` + CORS preflight match the existing frontend, and keep the `supabaseAdmin` service role client to avoid RLS issues.

## Function: `ai-proxy` (`gulfara/functions/ai-proxy/index.ts`)
- **Trigger**: POST w/ `Bearer` Clerk token and a body `{ userId, model?, messages?, action? }` used to relay requests to OpenAI.
- **Auth**: Reuses the same Web Crypto JWKS verifier so the edge runtime does not import `jose`; tokens must be RS256-signed and must match `userId`.
- **Controls**: Reads the current calendar month from `user_api_usage` (indexed via `period`) and enforces a hard cap before hitting OpenAI; records every request with `tokens_used`, `cost_usd`, and optional `action` so usage dashboards stay accurate.
- **Forwarding**: Sends a POST to `https://api.openai.com/v1/chat/completions` with conservative defaults (`gpt-4o-mini`, temperature `0.2`, max tokens `800`), then returns `choices` alongside calculated `tokensUsed`/`costUsd`.
- **Failure modes**: Rejects unauthorized requests, missing API keys, monthly cap breaches, or OpenAI failures with descriptive JSON payloads so the UI can respond safely.

## Error Response Schema
All functions return consistent JSON error shapes for client handling:

```typescript
{
  "error": string,           // Human-readable error message
  "code": string,            // Machine-readable error code (AUTH_FAILED, RATE_LIMITED, etc.)
  "details"?: any            // Optional debug context (omitted in production)
}
```

**HTTP Status Codes:**
- `401 Unauthorized` — Invalid/missing Clerk token
- `403 Forbidden` — Monthly cap exceeded (ai-proxy only)
- `400 Bad Request` — Malformed payload
- `500 Internal Server Error` — Database or OpenAI failure
- `200 OK` — Success (even if SRS calculation fails; check response body)

**Example Error (ai-proxy monthly cap):**
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/ai-proxy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"...","messages":[...]}'

# Response (403):
{"error":"Monthly cap of $5.00 exceeded","code":"RATE_LIMITED","usage":{"current":5.12,"limit":5.00}}
```

## Performance SLOs
- **review**: p95 latency <200ms (cold start <800ms)
- **ai-proxy**: p95 latency <1500ms (excludes OpenAI RTT; cold start <1000ms)
- **Timeout**: Both functions hard-timeout at 25s (Supabase Edge default)

## Deployment Checklist
1. **Version Requirements**: Supabase CLI `>=1.150.0`, Deno `>=1.40.0`
2. **Configure Secrets**: Add the service-role secrets to Supabase project settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_USER_MONTHLY_CAP`
   - `CLERK_JWKS_URL`
3. **Local Verification**:
   ```powershell
   deno check .\gulfara\functions\review\index.ts
   deno check .\gulfara\functions\ai-proxy\index.ts
   ```
4. **Deploy Functions**:
   ```bash
   supabase functions deploy review --project <ref>
   supabase functions deploy ai-proxy --project <ref>
   ```
5. **Enable Feature Flags**: Set in `.env`:
   ```bash
   VITE_USE_EDGE_REVIEW=true
   VITE_USE_EDGE_AI_PROXY=true
   ```
6. **Smoke Test**:
   ```bash
   # Test review endpoint
   curl -X POST https://<project-ref>.supabase.co/functions/v1/review \
     -H "Authorization: Bearer <valid-clerk-token>" \
     -H "Content-Type: application/json" \
     -d '{"userId":"...","cardId":"...","quality":4,"timeSpent":30,"correct":true,"pointsEarned":10}'

   # Test ai-proxy endpoint
   curl -X POST https://<project-ref>.supabase.co/functions/v1/ai-proxy \
     -H "Authorization: Bearer <valid-clerk-token>" \
     -H "Content-Type: application/json" \
     -d '{"userId":"...","messages":[{"role":"user","content":"Test"}]}'
   ```

### Rollback Strategy
- **Immediate** (<5 min): Flip `VITE_USE_EDGE_REVIEW` / `VITE_USE_EDGE_AI_PROXY` back to `false` in `.env` to return clients to the legacy HTTP path.
- **Full Removal**: `supabase functions delete review --project <ref>` (secrets persist; safe to redeploy later).
- **Secrets**: Supabase secrets can stay in place; the functions simply stop being called once the flags are off.
