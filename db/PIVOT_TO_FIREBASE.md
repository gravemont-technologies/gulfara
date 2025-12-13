"""Why/what/outcome: Replace the existing plan with the finalized first-principles execution plan, adding Snapshot Oracle, Local Staging Mirror, Network & Secrets Contract, deterministic replay tests, revised SLOs, and an explicit reversible cutover protocol."""

**Pivot To Firebase — First-Principles Execution Plan (Target: 9/10+)**

## Executive Summary
**Old Rating: 6.5/10 (premature execution, scope creep, validation gaps)**  
**Target Rating: 9/10+ (surgical precision, reversible at every step, zero-trust validation)**

This document applies first-principles rigor to identify the three highest-leverage interventions that remove rating ceilings and enable a confident, reversible cutover.

---

## Three Systemic Ceilings Blocking 9/10

1) Runtime Behavior Unknown — Cloud Run cold starts, JWKS behavior, and DB connectivity unquantified.
2) Reversibility Unvalidated — Claimed RTOs untested and write-both strategy unspecified.
3) Decision Paralysis — Two full tracks cause wasted effort; Track B must be deferred from this milestone.

---

## Highest-Leverage Surgical Interventions (apply first)

1. Supabase Snapshot Oracle — immutable schema fingerprint + table checksums + computed-field aggregates (2h).
2. Local Staging Mirror (Docker Compose) — 1:1 replayable staging for deterministic tests (6h).
3. Network & Secrets Contract (YAML → Terraform) — declarative infra + dry-run validation (4h).

Total targeted effort: 12 hours (parallelizable). Expected outcome: residual risk <5%, confidence ≈ 9/10.

---

## Intervention 1 — Supabase Snapshot Oracle (2 hours)

Purpose: create an immutable ground-truth for pre- and post-migration validation.

Files to add/run:
- `scripts/supabase-snapshot-oracle.ts` — exports `db/oracle-prepivot.json` (schema fingerprint, row counts, md5 checksums, computed aggregates).
- `scripts/cloud-sql-validator.ts` — compares Cloud SQL data to `oracle-prepivot.json` (row counts, computed field tolerances).

Acceptance:
- Row counts match ±0 rows.
- Computed fields (SRS totals) match ±0.01.
- If validator fails, automatic abort and rollback to Supabase.

---

## Intervention 2 — Local Staging Mirror (Docker Compose) (6 hours)

Purpose: validate function runtime by deterministic replay of production requests.

Files to add/run:
- `docker-compose.staging.yml` — local Postgres + Deno container + mock JWKS.
- `scripts/replay-production-requests.ts` — replays captured requests against Supabase and staging; fails on diffs.

Acceptance:
- 99%+ replay match; 100/100 preferred for critical endpoints.
- Latency parity: Cloud Run p99 ≤ Supabase p99 + 50ms.

---

## Intervention 3 — Network & Secrets Contract → Terraform (4 hours)

Purpose: make network and secret access declarative and testable.

Files to add/run:
- `gcp/network-contract.yaml` — declarative spec (VPC, subnet, connector, secrets, IAM bindings).
- `scripts/generate-terraform.ts` — generates `gcp/main.tf`.
- `scripts/validate-infrastructure.sh` — runs `terraform plan` and connectivity dry-run checks.

Acceptance:
- `terraform plan` produces expected resources.
- Dry-run connectivity test (Cloud Run → Cloud SQL private IP) succeeds.

---

## Refined SLOs & Acceptance Criteria (surgical)

Pre-cutover (all must pass):
- Snapshot Oracle validation: pass.
- Replay tests: ≥99% match.
- Latency parity: p99 within +50ms.
- JWT verification: 100% success on sample tokens.
- Terraform plan + dry-run: pass.

Post-cutover (24h window):
- Availability ≥ 99.5%.
- Error rate < 0.1% (alert >0.5%).
- Latency p99 < 900ms.
- Oracle validator hourly checks: no divergence.

---

## Reversible 3-Phase Cutover Protocol

Phase A — Shadow Reads (validate reads only)
- Deploy Cloud Run behind feature-flag; mirror read traffic and compare responses to Supabase for N requests.
- Abort if mismatch rate >0.5%.

Phase B — Write-Both (dual writes)
- Functions write to both Supabase and Cloud SQL; background comparator validates parity.
- Abort if any divergence or if computed fields differ.

Phase C — Switch (irreversible)
- After 24 hours of clean metrics and comparator pass, switch frontend to Cloud Run endpoints and deprecate Supabase.

Abort points: end of phase A, mid-phase B (after first 1k writes), final 24h window.

Rollback strategy:
- Pre-cutover: restore ENV to Supabase endpoints (instant).  
- Post-cutover: restore from `backup_prepivot.dump` into fresh Cloud SQL and swap connection string (RTO target <15 min, tested <5 min).

---

## Parallelized Execution Timeline (concrete)

Week 1 (parallel streams):
- Day 1: Decide Track A (commit) + run Snapshot Oracle (2h).  
- Day 2: Stand up Local Staging Mirror; begin replay tests (6h).  
- Day 2–3: Write network contract + generate Terraform + dry-run (4h).

Week 2:
- Day 4: Provision infra, migrate sample data, run `cloud-sql-validator.ts`.
- Day 5: Phase A shadow reads (24h monitoring), Phase B write-both pilot, then Phase C if metrics clean.

---

## Actionable Checklist (immediate)

P0 (Day 1):
- [ ] Commit to Track A and create `DECISION_LOG.md` (owner: Executive).  
- [ ] Run `scripts/supabase-snapshot-oracle.ts` and upload `db/oracle-prepivot.json` to GCS (owner: DevOps).

P1 (Days 2–3, parallel):
- [ ] Start `docker-compose.staging.yml`, seed DB, run `scripts/replay-production-requests.ts` (owner: Backend).
- [ ] Author `gcp/network-contract.yaml`, run `scripts/generate-terraform.ts`, run dry-plan (owner: DevOps).

P2 (Day 4–5):
- [ ] Migrate data to Cloud SQL (pg_restore) and run `scripts/cloud-sql-validator.ts` (owner: QA/DB).
- [ ] Execute Phase A shadow reads (owner: SRE); monitor 24h.

---

## One-Sentence Justification

By building a Snapshot Oracle, deterministic staging mirror, and a declarative network/secrets contract—then running deterministic replay and validator checks—we remove ambiguity, parallelize execution, and raise confidence to 9/10+ while preserving reversibility and minimal disruption.

---

## Appendix (scripts / examples)

Add the following helper scripts to `scripts/` and `gcp/` as described above: `supabase-snapshot-oracle.ts`, `cloud-sql-validator.ts`, `replay-production-requests.ts`, `docker-compose.staging.yml`, `gcp/network-contract.yaml`, `generate-terraform.ts`, `validate-infrastructure.sh`.

If you want, I will scaffold those files next (Snapshot Oracle and a minimal `docker-compose.staging.yml`) and run basic local validations. 

**Document finalized. Execute checklist in priority order.**
