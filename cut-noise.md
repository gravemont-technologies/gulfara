Cut Noise — Surgical Repo Simplification Plan
===========================================

Brutal Rating (1–10)
---------------------
Rating: 4/10

Concise Post‑Mortem
-------------------
- Root causes:
  - Secrets and environment files were tracked (client OpenAI key present) — primary security and compliance risk.
  - Multiple overlapping implementations (client-side SRS + server-side SRS + sync scripts) causing duplication and maintenance burden.
  - Large test surface and third-party test code included in discovery causing brittle CI runs.
  - Noise files and artifacts (.specstory, .cursor, checked-in node_modules, test reports) inflated repo size and obfuscated needed files.

- Hidden assumptions:
  - The client is trusted to perform authoritative SRS calculations and writes.
  - Tests discovered every file under node_modules and packages would be stable in the developer machine environment.
  - Environment values can safely live in repo files (.env), which exposed secrets.

- Duplicated efforts:
  - SRS logic implemented both client and server side.
  - Multiple queue/sync implementations: `offlineQueue`, `sync.ts`, `sync.js` and `queueAction` overlap.
  - Docs scattered with overlapping deployment/setup instructions.

Remediation (surgically precise)
--------------------------------
Each action below is atomic, reversible (with rollback), and prioritized.

P0 — Immediate (0–30 minutes)
- Action: Remove tracked `.env` and rotate keys.
  - Command: `git rm --cached .env && git commit -m "Remove tracked .env" && echo ".env" >> .gitignore`.
  - Owner: Ops/Developer who manages provider secrets.
  - Resources: Access to Supabase & OpenAI console to rotate keys.
  - Rollback: Re-add previous key to runtime only if absolutely required, but reverting is discouraged.

P0 — Immediate (0–30 minutes)
- Action: Remove large/accidental artefacts and ignore them.
  - Commands:
    - `git rm -r --cached .specstory .cursor .test-reports || true`
    - Append these patterns to `.gitignore` and commit.
  - Owner: Dev lead.
  - Resources: None.
  - Rollback: Restore files from branch/commit if needed.

P1 — High impact (2–8 hours)
- Action: Centralize SRS & progress writes to server (Edge Functions or a single server endpoint).
  - Owner: Backend engineer.
  - Steps:
    1. Implement `POST /functions/v1/review` per `edge-pivot.md`.
    2. Remove authoritative SRS upserts from client; keep a thin deterministic fallback (feature flagged).
  - Resources: Existing server code; `edge-pivot.md` as guide.
  - Rollback: Feature flag `USE_EDGE_REVIEW=false` to revert clients to previous behavior.

P1 — High impact (1–4 hours)
- Action: Replace direct client OpenAI calls with `ai-proxy` edge function and persist usage for cost control.
  - Owner: Backend.
  - Resources: OpenAI key stored as secret in Supabase; modify `aiAdapter` to POST to `/functions/v1/ai-proxy`.
  - Rollback: Re-enable client-side OpenAI only temporarily via feature flag and regenerate keys.

P1 — Medium (1–3 hours)
- Action: Consolidate queue/sync code into one small module with limits and exponential backoff.
  - Owner: Frontend engineer.
  - Resources: Tests to validate flush behavior.
  - Rollback: Reintroduce previous modules while investigating.

P2 — Low (0.5–2 days)
- Action: Test surface reduction: limit Vitest discovery, mock third-party internals, and move heavy E2E to CI-only Playwright directory.
  - Owner: QA/Dev.
  - Rollback: Re-enable broad discovery in vitest config.

Docs requirement (must be enforced)
---------------------------------
- All `.md` files must either be updated to reflect the Edge-Pivot + simplified architecture or be removed.
- Action:
  - Canonical docs to KEEP and update: `edge-pivot.md`, `ENVIRONMENT_SETUP.md` (trim), `README.md` (minimal run instructions).
  - Remove or archive everything else to `/docs/archive` and link from README if needed.
  - Owner: Docs owner / Tech writer.
  - Rollback: Restore archived docs from the archive folder or Git history.

Ranking fixes (PIE and ICE)
--------------------------
- PIE (Potential, Importance, Ease) ranking (1–10):
  1. Remove tracked secrets: PIE 10
  2. Centralize SRS to server: PIE 9
  3. Move OpenAI to ai-proxy: PIE 8
  4. Remove repo artefacts: PIE 8
  5. Consolidate queue: PIE 7
  6. Reduce test discovery: PIE 6

- ICE (Impact, Confidence, Effort) scoring (1–10):
  1. Remove tracked secrets: ICE 10
  2. Centralize SRS to server: ICE 9
  3. Move OpenAI to ai-proxy: ICE 8
  4. Remove repo artefacts: ICE 9
  5. Consolidate queue: ICE 7
  6. Reduce test discovery: ICE 6

Acceptance SLOs (measurable)
---------------------------
1. Security SLO
   - Objective: 0 secrets in repository files. Acceptance: `git grep -I "sk-\|SUPABASE_SERVICE_ROLE_KEY"` returns no results in main; CI secret scan passes.
2. Functionality SLO
   - Objective: `POST /functions/v1/review` returns 200 and writes SRS + progress in staging. Acceptance: staging smoke demonstrates persisted rows for 3 sample reviews.
3. Test surface SLO
   - Objective: Local `npx vitest run` completes in < 2 minutes on CI light runner and only runs targeted tests. Acceptance: CI run shows tests complete within budget and Playwright only runs in CI job.
4. Durability SLO
   - Objective: Offline queue flush success >= 99% within 24 hours. Acceptance: integration test simulates disconnect/reconnect and verifies flush ratio.

Precise surgical final plan (ready-to-execute)
--------------------------------------------
Sequence (run in order):
1) Rotate keys now (Ops) and confirm new secrets are set in Supabase/OpenAI.
2) Remove tracked secrets and noisy artefacts (run on local branch):
   ```cmd
   git checkout -b cleanup/cut-noise
   git rm --cached .env || true
   git rm -r --cached .specstory .cursor .test-reports || true
   echo ".env" >> .gitignore
   echo ".specstory/" >> .gitignore
   echo ".cursor/" >> .gitignore
   echo ".test-reports/" >> .gitignore
   git commit -m "chore: remove tracked env and repo artefacts; ignore them"
   ```
3) Implement Edge functions and client redirects behind feature flags (code change, feature-flagged rollout):
   - Add `functions/review/index.ts` and `functions/ai-proxy/index.ts` using `edge-pivot.md` skeleton.
   - Update `aiAdapter` to POST to `/functions/v1/ai-proxy` behind `USE_EDGE_AI_PROXY` flag.
   - Update review calls to use `/functions/v1/review` behind `USE_EDGE_REVIEW` flag.
4) Consolidate queue into `src/lib/queue.ts` and replace `offlineQueue`, `sync.*` usages.
5) Reduce Vitest discovery in `vitest.config.ts` and add `tests/e2e` to Playwright-only folder.
6) Docs: update `README.md` to point to `edge-pivot.md` and move unrelated .md to `docs/archive/`.
7) Run tests, smoke deploy to staging, validate SLOs, then open PR for review and merge when green.

Rollback strategy
-----------------
- If anything fails in staging: set feature flags back (`USE_EDGE_REVIEW=false`, `USE_EDGE_AI_PROXY=false`) and revert the commit that changed client endpoints. Supabase functions can be rolled back to previous versions.

Final one-liner justification
----------------------------
Cutting noise and centralizing authority (Edge Functions + single source-of-truth for SRS + ai-proxy) removes the largest security, cost, and maintenance risks and reduces repo entropy so the team can operate reliably and scale.

---
File saved by automation: `cut-noise.md` — update as you execute changes.
