## Gulfara Testing Strategy

**Priorities:** Surgical Efficiency · Scalability · Robustness/Reliability

This strategy specifies the exact checks that keep Gulfara dependable while scaling. We target high and medium impact capabilities first, measuring coverage against learning outcomes and platform stability. Low-priority polish is intentionally deferred to preserve throughput.

---

### Testing Principles
- **User success first:** Validate scenarios that prove a learner can onboard, study, review, and see progress without blockers.
- **Regression resilience:** Every release must protect core loops—authentication, adaptive practice, SRS scheduling, analytics.
- **Automation where it counts:** Critical paths receive automated coverage; exploratory/manual sessions target nuanced cultural and UI behaviors.
- **Test data parity:** Seeded Supabase fixtures mirror production schemas so confidence in AI, SRS, and rewards logic remains high.

---

### Priority Matrix
| Priority | Feature / Component | Rationale |
|----------|--------------------|-----------|
| **High** | Clerk Authentication & Session Persistence | Gatekeeper to all learning experiences. |
| **High** | Supabase Sync & RLS Enforcement | Guarantees learner data integrity and privacy. |
| **High** | Adaptive AI Tutor (`aiAdapter`, `costOptimizer`) | Powers difficulty tuning and recommendations—core differentiator. |
| **High** | Spaced Repetition Engine (`srsEngine`) | Ensures learning efficacy via scheduling accuracy. |
| **High** | Flashcard Practice Flow (`Practice` page, `GulfaraFlashcard`) | Primary engagement loop. |
| **High** | Dashboard Analytics (`Dashboard`, `CostMonitor`) | Drives retention through visible progress and AI transparency. |
| **Medium** | Onboarding Quiz & Persona Collection | Shapes personalization; failure misconfigures later sessions. |
| **Medium** | Gamification & Rewards (`Rewards`, streak logic) | Motivates repeat visits. |
| **Medium** | Theme & Accessibility Layer (`ThemeContext`, dark mode, contrast fixes) | Supports late-night study and inclusive design. |
| **Medium** | Landing Page Conversion Funnel (`GulfaraLanding`, `FlippableCard`) | First impression and marketing conversion. |

---

### Feature Coverage by Test Type
| Feature Cluster | Unit Tests | Integration Tests | API / Contract Tests | Smoke Tests | E2E Journeys |
|-----------------|-----------|-------------------|----------------------|-------------|--------------|
| **Auth & Identity** | Token utilities, Clerk hooks | Clerk ↔ Supabase profile sync, RLS guardrails | Clerk webhook signature validation | Sign-in/sign-out | New learner signup → dashboard |
| **Adaptive AI Tutor** | Prompt builders, cost caps, difficulty math | Tutor requests persisted against usage logs | OpenAI request/response schema | N/A | Adaptive practice loop (good/bad runs) |
| **SRS Engine** | SM-2 scheduling edge cases | Practice session writes/reads | N/A | Daily review launch | Full session completion & streak update |
| **Practice Experience** | Card flip state, timer calculations | Card queue hydration from Supabase | N/A | Load practice screen | Submit answers → XP update |
| **Analytics Dashboard** | Progress helpers, cost math | Aggregation queries, component integration | `/api/sync` happy-path/ failure responses | Dashboard loads without errors | Scenario replay with seeded data |
| **Gamification & Rewards** | Reward tier thresholds | Voucher issuance + Supabase persistence | N/A | Rewards tab renders | Unlock reward after meeting XP |
| **Theming & Accessibility** | Theme reducer, persisted preference | Local storage + DOM class handshake | N/A | Toggle theme | Theme toggle across onboarding/practice |
| **Landing & Conversion** | CTA click handlers | N/A | N/A | Landing hero renders | Landing → Onboarding funnel |

### Test Suites

#### 1. Unit Tests
- **SRS scheduling:** Validate SM-2 calculations (next review date, ease adjustments) with known input/output tables.
- **Cost optimizer:** Simulate token consumption, monthly resets, and model selection thresholds.
- **AI prompt builders:** Ensure difficulty/recommendation prompts contain required fields and fall back gracefully when data sparse.
- **Theme toggles:** Confirm `ThemeContext` flips classnames and persists preference.

#### 2. Integration Tests
- **Auth + Supabase handshake:** Use mocked Clerk webhooks to verify profile creation, RLS access, and row ownership.
- **Practice session lifecycle:** Start session → fetch cards → submit responses → persist outcomes in Supabase.
- **Dashboard rollup:** Seed Supabase metrics and confirm aggregation renders without runtime errors.
- **Rewards unlock flow:** Trigger XP thresholds and assert vouchers/levels update consistently.

#### 3. API / Contract Tests
- **Clerk webhooks:** Validate signature verification, payload schema, and idempotency handling.
- **Supabase RPC / REST endpoints:** Exercise `/api/sync` and any edge functions for success, auth failure, and rate-limit paths.
- **OpenAI proxy calls:** Mock OpenAI to ensure request envelopes respect token budget and error retries.

#### 4. Smoke Tests
- **Build verification:** Launch app, visit `/`, `/onboarding`, `/dashboard`, `/practice`, `/rewards` to confirm no fatal console errors.
- **Service availability:** Verify Supabase, Clerk, and OpenAI credentials resolve before deeper testing begins.
- **Feature toggles:** Confirm theme switch and localization defaults function immediately after deployment.

#### 5. End-to-End (Playwright / Cypress)
- **Smoke path (High priority):** Sign in → complete onboarding → run first practice → view dashboard stats.
- **Adaptive loop:** Answer cards poorly, confirm AI lowers difficulty; answer well, confirm difficulty rises and recommendations shift.
- **Retention loop:** Simulate multi-day streak, confirm streak counter, XP progression, and daily reminder banners (future).
- **Dark mode accessibility:** Toggle theme, run contrast assertions on onboarding quiz choices, ensure text remains legible.
- **Landing conversion (Medium priority):** Visit landing, interact with flippable card, click CTA, ensure navigation to onboarding works.

---

### Test Artifacts & Automation
- **Frameworks:** Vitest for unit/integration, Supertest for API contracts, Playwright for smoke/E2E.
- **Mocking:** Use Supabase local dev or Testcontainers; mock Clerk webhooks and OpenAI responses with deterministic fixtures.
- **Data fixtures:** Maintain Supabase seed pack + Playwright data builders synced with production schema migrations.
- **Reporting:** Publish coverage thresholds (min 80% on high-priority modules) and Playwright HTML reports to CI artifacts; log API contract results separately for audit.
- **Observability hooks:** Capture Supabase query metrics, Clerk webhook response codes, and OpenAI token usage per run for trend analysis.

### Execution Workflow & Logging
| Stage | Trigger | Suites | Recording Expectations |
|-------|---------|--------|------------------------|
| **Local dev** | Feature branch work | Targeted unit + integration + manual UI smoke check | Update Jira/issue with failures, attach Vitest output, capture screenshot/console of UI |
| **Pre-commit hook** | `lint-staged` script | Lint, unit smoke subset | Abort commit on failure, auto-format diagnostic summary |
| **Pre-push** | Manual or git hook | Full unit, focused integration, API contracts | Store results in `.test-reports/` for reviewer download |
| **CI pipeline** | Pull request | Lint → unit → integration → API → smoke | Upload coverage + contract artifacts, annotate PR with failures |
| **Nightly** | Scheduled | Full E2E matrix (desktop/mobile) | Publish Playwright trace packs + Supabase/Clerk usage snapshots |
| **Pre-release** | Staging promotion | Full suite + manual exploratory checklist | Record findings in release ticket; confirm dashboards clean |
| **Post-deploy** | Production health check | Smoke + API ping + cost monitor check | Log run in ops channel, capture metrics diffs vs. previous deploy |

---

### Regression Checklist (Run Each Release)
1. **Authentication:** Can a new user sign up, resume session, and sign out?
2. **Onboarding:** Persona quiz stores responses; gender options limited to Male/Female with correct styling.
3. **Practice:** Cards load, flip animation works, answer submission updates streak and SRS payload.
4. **AI Calls:** `costOptimizer` permits request (< $0.01/user) and logs usage; fallback messaging when quota exceeded.
5. **Dashboard:** Stats, category progress, and cost monitor render without console errors.
6. **Rewards:** Level-up thresholds release vouchers; redemption state persists across reloads.
7. **Theme:** Light/dark mode persists, meets contrast requirements on onboarding and practice.
8. **Accessibility smoke:** Keyboard navigation through flashcards and onboarding works; focus states visible.

---

### Change Management Workflow
1. **Feature spec includes test impact analysis**—identify affected high/medium priorities.
2. **Update fixtures** in Supabase seed scripts and `flashcards.json` as needed.
3. **Write/extend tests** before or alongside feature work (TDD encouraged for SRS/AI logic).
4. **Run local sequence:** `npm run lint` → `npm run test:unit` → targeted `npm run test:integration`.
5. **Pre-push hook:** Execute API contract and smoke tests to guard shared environments.
6. **Code review checklist** includes verifying tests exist for the change, seed data updates, and cost guardrails.
7. **Post-deploy verification**: Run smoke + E2E suites in staging; monitor Supabase, Clerk, OpenAI dashboards for anomalies.
8. **Pre-smoke sanity**: Launch app locally with production-equivalent env values, confirm hero CTA renders, and document console/network status before automated Playwright runs.

---

### Continuous Refinement
- Reassess priority matrix quarterly or when releasing marquee features (e.g., voice drills, Pomodoro rooms).
- Archive obsolete tests quickly to reduce maintenance friction.
- Capture exploratory test findings in Notion/issue tracker for follow-up automation.

This strategy remains the living reference for verifying Gulfara’s critical learning experiences with each iteration.


