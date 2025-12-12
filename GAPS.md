# Deployment & Reliability Gaps

**Date:** 2025-12-11  
**Status:** Post-Supabase removal, Firebase-only architecture  
**Current Rating:** 72/100 — functionally incomplete; critical integration and auth/DB gaps remain

---

## Honest Assessment

### Root Causes
1. **Edge function reliance without resilience hardening** — no retries, circuit breakers, or idempotency; breaks on cold starts, timeouts, or concurrency spikes.
2. **Missing server-side secrets** — `backend.env` not populated; no FIREBASE_ADMIN_*, OPENAI_API_KEY in secure vaults.
3. **No staging validation** — emulators not run, no preflight gate in CI, no rollback SLOs defined.
4. **Optimistic UI gaps** — button presses lack client-side rollback; sync failures invisible to users until timeout.
5. **Monitoring blind spots** — no structured logs, error budgets, or p95/p99 latency tracking; cannot diagnose prod incidents.

### Hidden Assumptions
- **Assumption:** Edge functions = full backend replacement → **Reality:** They lack state, long-running task support, and transaction guarantees.
- **Assumption:** Firebase auto-scales without config → **Reality:** Firestore has rate limits; concurrent writes need batching/throttling.
- **Assumption:** Tests passing = prod-ready → **Reality:** Integration tests mock Supabase; Firebase runtime never validated end-to-end.

---

## Brutal Readiness Assessment (2025-12-12)

**Rating:** 72 / 100 — realistic, evidence-based. The app boots and several public flows are scaffolded, but core authenticated flows, SRS persistence, and AI integrations are untested end-to-end and will likely fail on first full integration attempt.

### Key Findings (brief)
- Untested integration chains (Auth → API → Firestore) — highest probability of breakage.
- Edge handlers are partially stubbed and missing auth validation, idempotency, and persistent writes.
- Firestore rules and migrations have not been validated in an emulator or staging environment.
- OpenAI usage and cap enforcement are not exercised; side effects (billing, throttling) unknown.

### Most-Likely Failure Modes (ordered)
1. Auth token validation missing/incorrect → 401/unauthorised on critical endpoints.
2. Review / SRS API returns success but doesn't persist → user progress lost or inconsistent.
3. OpenAI proxied calls exceed quota or fail silently → UX degraded and costs spike.
4. Firestore rules allow unintended access or block legitimate writes → data integrity/auth limbo.

### Exact Gaps (surgical list)
- Auth token validation in edge functions — Critical
- Firestore rules enforcement & testing — Critical
- SRS engine + review handler persistence — Critical
- Clerk JWKS fetch + token decode at startup — High
- OpenAI integration + rate/cost controls — High
- Optimistic UI + rollback + retries — High
- Database seeding/migrations for dev & staging — High
- Observability (structured logs + performance traces) — Medium
- Staging deploy + smoke tests (CI preflight) — Medium

---

## Surgical Remediation Plan (ordered by impact × urgency)

Phase 1 — Auth & Rules (Blocker removal, 2–3h)
1. Add Clerk JWT verification to all edge handlers; fail fast with 401 on invalid tokens. (Owner: Backend, 1h)
2. Implement automated Firestore rules tests against emulators; prevent unauthorized reads/writes. (Owner: Backend, 1–2h)

Phase 2 — Core API handlers (Restore persistent flows, 3–4h)
3. Replace `/api/review` stub with real SRS logic and Firestore writes; add idempotency via `_idempotency` collection keyed by `X-Request-ID`. Add unit + integration tests. (Owner: Backend, 2–3h)
4. Replace `/api/ai-proxy` stub with real OpenAI calls; add usage logging (per-user) and enforce `OPENAI_USER_MONTHLY_CAP`. (Owner: Backend, 1–2h)
5. Add DB seed script to populate test users/cards for emulator/staging. (Owner: Backend, 1h)

Phase 3 — Frontend resilience (UX & stability, 2–3h)
6. Implement optimistic UI updates for review flows with immediate rollback on failure. (Owner: Frontend, 1–2h)
7. Wrap API calls in exponential-backoff retries and a simple circuit breaker. (Owner: Frontend, 1h)

Phase 4 — Observability & Deploy (enable diagnosis, 2–3h)
8. Add structured logging to edge handlers and client error reporting; enable Firebase Performance traces for p95/p99. (Owner: DevOps, 1–2h)
9. Create a staging Firebase project or use emulators in CI; add smoke tests for `/health`, `/api/review`, `/api/ai-proxy`. (Owner: DevOps, 1–2h)

Phase 5 — CI Gate & SLOs (ops hardening, 2–4h)
10. Require `npm run preflight` (env checks + build + tests) as a blocking CI job. (Owner: DevOps, 1–2h)
11. Define SLOs (availability 99.5%, p95 <200ms for review); wire alerts for 5xx spikes. (Owner: DevOps, 1–2h)

---

## Acceptance Criteria (short)
- `npm run env:status` reports all FIREBASE_ADMIN_*, CLERK_JWKS_URL, OPENAI_API_KEY set.
- Auth-protected endpoints return 401 for invalid tokens, 200 for valid tokens.
- `/api/review` persists SRS state in Firestore for a single test user when called by emulator tests.
- OpenAI proxy logs usage per user and enforces `OPENAI_USER_MONTHLY_CAP`.
- Emulators and staging smoke tests pass; CI preflight blocks merges on failure.

## Revised Execution Checklist (Next 8 Hours)
- [ ] Hour 0–1: Populate `.env` + run `npm run preflight` locally (Phase 1)
- [ ] Hour 1–3: Add idempotency + retries to `/api/review` and `/api/ai-proxy` (Phase 2)
- [ ] Hour 3–4: Implement optimistic UI in Practice.tsx + retries (Phase 3)
- [ ] Hour 4–5: Start emulators + deploy to staging + smoke tests (Phase 4)
- [ ] Hour 5–7: Add structured logging + performance SDK (Phase 4)
- [ ] Hour 7–8: Configure CI emulator gate + preflight requirement (Phase 5)

---

## Notes
- Be brutally pragmatic: complete the minimal server-side fixes first (auth, persistence, rules) before optimizing UX.
- Keep all work behind feature branches; validate in emulator/staging before any production deploy.

### Duplicated Efforts (Already Fixed)
- ✅ Removed Supabase client stubs (7 files)
- ✅ Archived legacy docs/scripts to `archive/supabase-migration/`
- ✅ Consolidated `.env.example` to single canonical template
- ✅ Updated README to reflect Firebase-only stack

---

## Critical Gaps (Prioritized by PIE/ICE)

### Gap 1: Server Secrets & Preflight (Priority: P0)
**PIE:** 10×10×9 = 900 | **ICE:** 10×9/1 = 90  
**Owner:** DevOps | **ETA:** 0.5h | **Resources:** secret manager, `.env` template

**Problem:**  
No server-side secrets provisioned; `FIREBASE_ADMIN_*` and `OPENAI_API_KEY` missing; preflight checks not automated.

**Remediation Steps:**
1. Populate `.env` with server secrets (gitignored):
  ```bash
  cd gulfara
  # Copy the example template to .env once and populate the values
  copy .env.example .env
  # Fill values from your secret manager in the resulting `.env` file:
  # FIREBASE_ADMIN_PROJECT_ID=gulfara-cards
  # FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@gulfara-cards.iam.gserviceaccount.com
  # FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  # OPENAI_API_KEY=sk-...
  # OPENAI_USER_MONTHLY_CAP=5.00
  ```
2. Run preflight locally:
   ```powershell
   npm run env:status    # confirm all Firebase/Clerk keys set
   npm run preflight      # validate build + lint + env readiness
   ```
3. Add to CI (`.github/workflows/ci.yml`):
   ```yaml
   - name: Preflight
     run: npm run preflight
   ```

**Acceptance Criteria:**
- `npm run env:status` → all required keys flagged as set (exit 0)
- `npm run preflight` → passes in <30s
- CI job fails if preflight fails

**Rollback:** Remove the server keys from `.env`; revert CI changes.

---

### Gap 2: Edge Function Resilience (Priority: P0)
**PIE:** 9×10×8 = 720 | **ICE:** 10×9/2 = 45  
**Owner:** Core Dev | **ETA:** 2–4h | **Resources:** retry lib, idempotency keys

**Problem:**  
Edge handlers (`api/review.ts`, `api/ai-proxy.ts`) lack retries, idempotency, or circuit breakers; fail silently on cold starts, timeouts, or duplicate requests.

**Remediation Steps:**
1. **Add idempotency to `/api/review`:**
   ```typescript
   // Inside handler, before processing:
   const requestId = req.headers.get('X-Request-ID') || crypto.randomUUID();
   const dedupe = await firestoreAdmin.collection('_idempotency').doc(requestId).get();
   if (dedupe.exists) {
     return new Response(JSON.stringify(dedupe.data()), { status: 200 });
   }
   
   // After successful processing, store result:
   await firestoreAdmin.collection('_idempotency').doc(requestId).set({
     response: responseData,
     timestamp: FieldValue.serverTimestamp()
   }, { merge: true });
   ```

2. **Add client-side retry with exponential backoff:**
   ```typescript
   // In src/services/sync.js or wherever API calls are made:
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (err) {
         if (i === maxRetries - 1) throw err;
         await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
       }
     }
   }
   
   // Usage:
   const response = await retryWithBackoff(() => 
     fetch('/api/review', { 
       method: 'POST', 
       body: JSON.stringify(payload),
       headers: { 'X-Request-ID': crypto.randomUUID() }
     })
   );
   ```

3. **Add circuit breaker (simple threshold-based):**
   ```typescript
   // In src/lib/circuitBreaker.ts:
   class CircuitBreaker {
     constructor(private threshold = 5, private timeout = 60000) {}
     private failures = 0;
     private lastFailureTime = 0;
     
     async call(fn) {
       if (this.failures >= this.threshold && Date.now() - this.lastFailureTime < this.timeout) {
         throw new Error('Circuit open: too many failures');
       }
       try {
         const result = await fn();
         this.failures = 0;
         return result;
       } catch (err) {
         this.failures++;
         this.lastFailureTime = Date.now();
         throw err;
       }
     }
   }
   ```

**Acceptance Criteria:**
- Duplicate requests return cached response (200, identical payload)
- Transient failures retry with exponential backoff (test with network throttle)
- Circuit opens after 5 consecutive failures; recovers after 60s
- Unit tests validate retry logic + idempotency

**Rollback:** Revert handler changes; remove idempotency collection.

---

### Gap 3: Optimistic UI + Client Rollback (Priority: P1)
**PIE:** 8×9×7 = 504 | **ICE:** 9×8/1.5 = 48  
**Owner:** Frontend | **ETA:** 1–2h | **Resources:** React state, toast notifications

**Problem:**  
Button presses (review submission, AI hint) lack optimistic updates; users see spinner but no feedback on failure; no rollback on error.

**Remediation Steps:**
1. **Add optimistic SRS update in Practice page:**
   ```typescript
   // In src/pages/Practice.tsx:
   const handleReview = async (quality: number) => {
     const optimisticSRS = calculateNextReview(currentCard, quality); // local SM-2 calc
     setCurrentCard({ ...currentCard, srsData: optimisticSRS }); // immediate UI update
     
     try {
       const response = await fetch('/api/review', { ... });
       if (!response.ok) throw new Error('Review failed');
       const serverSRS = await response.json();
       setCurrentCard({ ...currentCard, srsData: serverSRS }); // sync with server
     } catch (err) {
       setCurrentCard(currentCard); // rollback to previous state
       toast.error('Review failed. Please try again.');
       logger.error('Review submission failed', err);
     }
   };
   ```

2. **Add loading + error states to AI proxy:**
   ```typescript
   const [hintLoading, setHintLoading] = useState(false);
   const [hintError, setHintError] = useState(null);
   
   const fetchHint = async () => {
     setHintLoading(true);
     setHintError(null);
     try {
       const response = await fetch('/api/ai-proxy', { ... });
       if (!response.ok) throw new Error('AI hint failed');
       // ... handle success
     } catch (err) {
       setHintError('Could not generate hint. Try again.');
       logger.error('AI hint failed', err);
     } finally {
       setHintLoading(false);
     }
   };
   ```

**Acceptance Criteria:**
- Card state updates immediately on button press (optimistic)
- Failed requests roll back to previous state within 500ms
- Error toast displays for all API failures
- Loading spinners disable buttons during async operations

**Rollback:** Revert optimistic state changes; restore synchronous flow.

---

### Gap 4: Staging Deploy + Smoke Tests (Priority: P1)
**PIE:** 9×9×7 = 567 | **ICE:** 9×7/2 = 31.5  
**Owner:** DevOps | **ETA:** 1h | **Resources:** Firebase staging project, curl scripts

**Problem:**  
No staging environment validated; emulators not run; no smoke tests against live Firebase endpoints.

**Remediation Steps:**
1. **Start local emulators:**
   ```powershell
   cd gulfara
   npx firebase emulators:start --only firestore,auth,functions
   # Terminal 2:
   curl http://localhost:5001/gulfara-cards/us-central1/review -X POST -d '{"userId":"test","cardId":"test","quality":3}'
   ```

2. **Deploy to staging:**
   ```powershell
   npx firebase login
   npx firebase use gulfara-cards
   npx firebase deploy --only firestore:rules,firestore:indexes --project gulfara-cards
   npx firebase deploy --only hosting --project gulfara-cards
   ```

3. **Run smoke tests against staging:**
   ```powershell
   npm run test:smoke -- --grep "@staging"
   # Or manual:
   curl https://gulfara-cards.web.app/health
   curl https://gulfara-cards.web.app/api/review -X POST -H "Authorization: Bearer <test-token>" -d '...'
   ```

**Acceptance Criteria:**
- Emulators start without errors; endpoints return 200
- Staging deploy completes in <10m; Firestore rules active
- Smoke tests pass (3 core endpoints: /health, /api/review, /api/ai-proxy)
- Rollback script tested (firebase hosting:rollback)

**Rollback:** `npx firebase hosting:rollback` (reverts to previous version).

---

### Gap 5: Monitoring + Error Budgets (Priority: P2)
**PIE:** 8×8×6 = 384 | **ICE:** 8×6/3 = 16  
**Owner:** DevOps | **ETA:** 2–4h | **Resources:** Firebase Console, structured logging

**Problem:**  
No metrics collection; cannot diagnose prod incidents; no SLOs or alerts for error spikes, latency, or auth failures.

**Remediation Steps:**
1. **Add structured logging to all handlers:**
   ```typescript
   // Use logger from Gap 2 in knowledge/gaps.md
   import { logger } from '@/lib/logger';
   
   // Inside each handler:
   const startTime = Date.now();
   logger.info('API called', { endpoint: '/api/review', userId });
   
   try {
     // ... handler logic
     logger.info('API success', { endpoint: '/api/review', latency: Date.now() - startTime });
   } catch (err) {
     logger.error('API error', err, { endpoint: '/api/review', latency: Date.now() - startTime });
   }
   ```

2. **Set Firebase Performance Monitoring:**
   ```typescript
   // In src/main.tsx:
   import { getPerformance } from 'firebase/performance';
   const perf = getPerformance(firebaseApp);
   ```

3. **Define SLOs + Error Budgets:**
   - **Availability:** 99.5% (43.2min downtime/month)
   - **Latency (p95):** <200ms for /api/review, <500ms for /api/ai-proxy
   - **Error Rate:** <1% of requests
   - **Alert thresholds:** 5xx spike >3% over 5min; p95 latency >500ms

**Acceptance Criteria:**
- Structured logs visible in Firebase Console (filter by severity)
- Performance traces show p95/p99 latency for API calls
- Alerts configured for 5xx rate >3% and latency >500ms
- Error budget dashboard shows monthly burn rate

**Rollback:** Remove logger calls; disable performance SDK.

---

### Gap 6: CI Preflight Gate (Priority: P2)
**PIE:** 8×8×6 = 384 | **ICE:** 8×7/2 = 28  
**Owner:** DevOps | **ETA:** 2h | **Resources:** GitHub Actions, emulator setup

**Remediation Steps:**
1. **Add emulator tests to CI:**
   ```yaml
   # .github/workflows/ci.yml
   - name: Start Firebase Emulators
     run: npx firebase emulators:start --only firestore,auth --project demo-test &
     
   - name: Wait for Emulators
     run: npx wait-on http://localhost:4000
     
   - name: Run Integration Tests
     run: npm run test:integration
     env:
       FIRESTORE_EMULATOR_HOST: localhost:8080
       FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
   ```

2. **Require preflight pass before merge:**
   ```yaml
   - name: Preflight Check
     run: npm run preflight
     
   - name: Build
     run: npm run build
     if: success()
   ```

**Acceptance Criteria:**
- CI runs emulators and tests against them (not production)
- Preflight failures block PR merge
- Build artifacts uploaded only if preflight + tests pass

**Rollback:** Remove emulator step; revert to production-only tests.

---

## SLOs & Acceptance Criteria (Summary)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Preflight Pass Time** | <30s | CI logs |
| **Test Coverage** | 100% passing | Vitest report |
| **API Latency (p95)** | <200ms | Firebase Performance |
| **Error Rate** | <1% | Structured logs |
| **Availability** | 99.5% | Uptime monitoring |
| **Deploy Time** | <10m | Firebase deploy logs |
| **Rollback Time** | <5m | Manual test |

---

## PIE/ICE Ranking (Top 5)

1. **Server secrets + preflight** — PIE: 900, ICE: 90 (blocks all deploys)
2. **Edge resilience** — PIE: 720, ICE: 45 (prevents prod outages)
3. **Optimistic UI** — PIE: 504, ICE: 48 (improves UX reliability)
4. **Staging deploy** — PIE: 567, ICE: 31.5 (validates pre-prod)
5. **Monitoring** — PIE: 384, ICE: 16 (enables incident response)

---

## Execution Checklist (Next 8 Hours)

- [ ] **Hour 0–1:** Populate `.env` + run `npm run preflight` locally (Gap 1)
- [ ] **Hour 1–3:** Add idempotency + retries to `/api/review` and `/api/ai-proxy` (Gap 2)
- [ ] **Hour 3–4:** Implement optimistic UI in Practice.tsx (Gap 3)
- [ ] **Hour 4–5:** Start emulators + deploy to staging + smoke tests (Gap 4)
- [ ] **Hour 5–7:** Add structured logging + Firebase Performance SDK (Gap 5)
- [ ] **Hour 7–8:** Configure CI emulator gate + preflight requirement (Gap 6)

---

## Rollback Strategy

All changes are reversible via:
1. **Code:** `git revert <commit>` or `git restore <file>`
2. **Firebase:** `npx firebase hosting:rollback` (previous version)
3. **Secrets:** Remove private keys from `.env` or remove from secret manager
4. **CI:** Revert `.github/workflows/ci.yml` changes

---

## First-Principles Diagnostic Protocol

**When tests fail or runtime breaks:**

1. **Isolate smallest failure unit:**
   - Is it a specific endpoint? → Check handler validation + logs.
   - Is it a Firestore query? → Verify rules + emulator behavior.
   - Is it a client timeout? → Check network tab + retry logic.

2. **Check highest-leverage components:**
   - **Auth:** Clerk token valid? Firebase rules enforced?
   - **Database:** Firestore connection established? Indexes created?
   - **Edge functions:** Cold start? Timeout? Memory limit?

3. **Apply surgical fix (minimal, reversible):**
   - Add targeted log statements (not console.log spam).
   - Insert retry with backoff (not infinite loops).
   - Add circuit breaker (not disabling endpoint).

4. **Validate fix in isolation:**
   - Unit test passes? → Integration test.
   - Integration test passes? → Emulator smoke test.
   - Emulator passes? → Staging deploy + smoke.
   - Staging passes? → Production canary (10% traffic).

5. **Document root cause + prevention:**
   - Update this GAPS.md with new learnings.
   - Add regression test to prevent recurrence.
   - Update runbook if operational issue.

---

## One-Sentence Justification

Edge functions provide low-latency front layers but require idempotency, retries, circuit breakers, optimistic UI, staging validation, and monitoring to avoid the exact "button press breaks" UX — implementing these 6 gaps (8h total) elevates the app from 92/100 to production-ready 98/100.
