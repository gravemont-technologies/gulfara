# Local Testing & Knowledge Share

This file captures the core knowledge for the new Clerk/Firebase admin stack to keep future work fast and predictable.

## 1. Why the three steps exist (in order of priority: 1 > 3 > 2)
| Step | Purpose |
| --- | --- |
| **Create the PR on GitHub** | This is the official “I’m done” moment: the PR locks in your pushed branch, triggers CI (lint/tests/deploy), and lets teammates or future-you review/merge safely. Without it the work is invisible and can’t ship. No PR = no production release. |
| **Replace the local harness with a Firestore emulator integration test** | Manual curls are fragile. A tiny emulator-backed Vitest integration test catches regression before it reaches prod, exercises the real admin ↔ Firestore flow, and runs automatically on every push. |
| **Document `docs/LOCAL_TESTING.md`** | Prevents the next person from wasting hours figuring out how to run the local harness. Capture commands like `npm run dev`, `firebase emulators:start`, curl/PowerShell snippets, and the real request/response payloads so “working” is obvious. |

## 2. Temporary local harness commands (until emulator tests exist)
The harness at `scripts/local-api-server.ts` runs a lightweight in-memory version of `/api/review`, `/api/ai-proxy`, and `/api/sync`. It allows quick verification without touching Firestore.

### Start the server (PowerShell)
```powershell
$env:LOCAL_API_PORT=4500
npx tsx scripts/local-api-server.ts
```

### Sample behavior/results
1. **Sync stub**
```powershell
Invoke-RestMethod -Uri 'http://localhost:4500/api/sync' -Method GET | ConvertTo-Json -Depth 5
```
Response:
```json
{
  "data": [],
  "message": "Sync endpoint stubbed during migration"
}
```

2. **Idempotent review flow (same request twice)**
```powershell
$body = '{"userId":"11111111-1111-1111-8111-111111111111","cardId":"22222222-2222-2222-9222-222222222222","quality":4,"timeSpent":12000,"correct":true,"pointsEarned":15}'
$hdr = @{
  'x-gulfara-request-id' = 'demo-request-1'
  'x-gulfara-user-id' = '11111111-1111-1111-8111-111111111111'
}
Invoke-RestMethod -Uri 'http://localhost:4500/api/review' -Method POST -ContentType 'application/json' -Body $body -Headers $hdr | ConvertTo-Json -Depth 5
```
Response:
```json
{
  "srsData": {
    "userId": "11111111-1111-1111-8111-111111111111",
    "cardId": "22222222-2222-2222-9222-222222222222"
  },
  "points": 15,
  "mastery": 0
}
```
Repeat the same command with the same `x-gulfara-request-id`. The second call returns the same 15 points, proving the idempotency guard works.

3. **AI proxy echo (PowerShell)**
```powershell
Invoke-RestMethod -Uri 'http://localhost:4500/api/ai-proxy' -Method POST -ContentType 'application/json' -Body '{"model":"gpt-5-nano","messages":[{"role":"user","content":"hi"}]}' | ConvertTo-Json -Depth 5
```
Response: the script echoes the request so you can inspect the payload that would normally go to OpenAI.

## 3. Next steps / how to graduate from this harness
- **Create the GitHub PR** (already done via the pushed branch). Use `gh pr create --base main --fill` if you have `gh`, or click the PR link shown in `git push` output. The PR is mandatory for CI and merging.
- **Write an emulator-backed integration test** (highest priority after the PR). The test should:
  - Start the Firestore emulator (`firebase emulators:start --only firestore`).
  - Point `process.env.FIRESTORE_EMULATOR_HOST` at the emulator address.
  - Call `reviewHandler` directly via Vitest (e.g., `tests/integration/reviewEmulator.test.ts`).
  - Validate SRS persistence and points totals before and after a duplicate request with the same `x-gulfara-request-id`.
  - **Run the new Vitest emulator integration** (once it exists, it can replace the manual harness). Use `npm run test:integration -- tests/integration/reviewEmulator.test.ts` (or `vitest run tests/integration/reviewEmulator.test.ts`). The test brings up the Firestore emulator via `node node_modules/firebase-tools/lib/bin/firebase.js emulators:start --only firestore --project gulfara-review-emulator`, sets `FIRESTORE_EMULATOR_HOST` for the handler, and tears the emulator down when the test finishes. If you need to debug the handler in isolation, you can still keep the harness instructions above, but the integration is the long-term, automatic safety net.
  - **Keep this doc updated**: once the emulator tests exist, add the commands, responses, and the CI workflow that runs them. Remove the temporary harness instructions if it becomes obsolete.

## 4. Emulator-backed integration test (current state)

- **Why it exists**: the new `tests/integration/reviewEmulator.test.ts` starts Firestore via the Firebase CLI, warms up the same persistence/code paths as the cloud handler, and asserts idempotent review writes so regressions get caught before merging. It replaces manual `curl` commands with an automated verification while still touching Clerk/JWKS verification and Firestore transactions.
- **Command to run (from the `gulfara` workspace root)**:
  ```powershell
  $env:CLERK_JWKS_URL = 'https://glowing-stud-76.clerk.accounts.dev/.well-known/jwks.json'
  npm run test:integration
  ```
- **Java requirement**: the emulator shipped via `firebase-tools` is a Java process that now requires JDK 21+. `java -version` must report 21.x (or higher) before the test can start the emulator. If you see `Error: firebase-tools no longer supports Java version before 21`, install a JDK21+ and restart the shell.
- **CI alignment**: `.github/workflows/integration-tests.yml` now installs Temurin 25 to keep emulator binaries happy in CI, so your local shell should match (JDK 25 is already installed on this machine and works fine; 21+ in general is supported).
- **Why the CLI is invoked directly**: Vitest spawns `node node_modules/firebase-tools/lib/bin/firebase.js` with `process.execPath` because `npx` can be unavailable inside the test runner on Windows, and the binary path ensures the helper is launched consistently.
- **Environment notes**: the test sets `process.env.FIRESTORE_EMULATOR_HOST` to `127.0.0.1:8080`, so `reviewHandler` automatically talks to the emulator without touching production Firestore. Clerk verification still runs, so the `Authorization: Bearer <token>` header or the mocked `x-gulfara-user-id` path must exist for the requests to succeed. Missing `CLERK_JWKS_URL` will cause the test to throw before it touches Firestore.
- **Environment notes**: the test automatically picks a free port (defaults to 8080 but jumps to the next available slot) and writes a temporary Firebase config so both the emulator and the handler share the same host/port. You can pin the port by setting `FIRESTORE_EMULATOR_PORT` before running `npm run test:integration` if you need to inspect logs/UI. Clerk verification still runs, so the `Authorization: Bearer <token>` header or the mocked `x-gulfara-user-id` path must exist for the requests to succeed. Missing `CLERK_JWKS_URL` will cause the test to throw before it touches Firestore.

## 5. Bonus notes
- Clerk verification only runs if `Authorization: Bearer ...` is provided. Without it, the handlers fall back on `getAuth` or the shim using `x-gulfara-user-id` for tests. Set `CLERK_JWKS_URL` in `.env` for real tokens.
- The local harness avoids Firestore entirely to keep things safe. Use the emulator tests for anything that touches persistence paths.