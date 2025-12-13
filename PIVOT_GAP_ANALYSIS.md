# PIVOT_TO_FIREBASE.md — Gap Analysis & Execution Status

**Generated**: December 2024  
**Purpose**: Comprehensive audit of PIVOT_TO_FIREBASE.md requirements vs. current repository state

---

## Executive Summary

**Overall Progress**: **Foundation Phase (40% Complete)**  
**Critical Gaps**: 6 P0/P1 interventions missing (Snapshot Oracle, Local Staging Mirror, Network Contract, validators)  
**Status**: Firebase migration infrastructure operational; production cutover tooling absent

---

## ✅ Completed (EDGIFY Phase)

### Firebase Client/Admin Infrastructure
- [x] `lib/firebase/client.ts` — Firebase client SDK initialization (browser-safe)
- [x] `lib/firebase/admin.ts` — Firebase Admin SDK initialization (server-only)
- [x] `lib/firebase/config.ts` — Firebase client configuration object
- [x] `lib/firebase/converters.ts` — Firestore data converters for type-safe document mapping

### Firebase Hooks & Actions
- [x] `lib/hooks/useAuth.ts` — Client-side Firebase auth hook (signIn, signUp, signOut, Google OAuth, resetPassword)
- [x] `lib/hooks/useFirestore.ts` — Realtime Firestore collection hook (onSnapshot subscriptions)
- [x] `app/actions/admin.ts` — Server actions for Firebase admin operations (setupNewUser, deleteUser)
- [x] `app/actions/flashcards.ts` — Server actions for flashcard CRUD (create, update, delete with revalidatePath)

### API Routes
- [x] `app/api/health/route.ts` — Health check endpoint
- [x] `app/api/auth/setup-user/route.ts` — HTTP route to provision new Firebase users
- [x] `app/api/auth/migrate-session/route.ts` — Exchange Supabase session token for Firebase custom token

### Firestore Configuration
- [x] `firestore.rules` — Security rules (isAuthenticated, isOwner, isAdmin helpers)
- [x] `firestore.indexes.json` — Composite indexes (flashcards, users, progress collections)
- [x] `firebase.json` — Firebase CLI configuration

### Migration Scripts
- [x] `scripts/migrate-data.ts` — Migrate Supabase flashcards/progress to Firestore (500-doc batches)
- [x] `scripts/migrate-users.ts` — Migrate Supabase auth users to Firebase Auth (custom claims, Firestore user docs)

### Environment Management
- [x] Single `.env` pattern (replaced backend.env split; gitignored)
- [x] `.env.example` — Template with public NEXT_PUBLIC_/VITE_ and private FIREBASE_ADMIN_/SUPABASE_SERVICE_ROLE_KEY placeholders
- [x] `scripts/log-env.cjs` — Preflight environment status checker (runs before dev/build)
- [x] `scripts/validate-env.cjs` — Migration validator (checks FIREBASE_ADMIN_* and SUPABASE_SERVICE_ROLE_KEY; validates PEM format)
- [x] `ENV_VARS.md` — Comprehensive environment variable documentation (20+ vars, public/private designation, usage locations)
- [x] `ENVIRONMENT_SETUP.md` — Updated for single .env pattern
- [x] `EDGIFY_MIGRATION.md` — Firebase migration strategy documentation

### NPM Scripts & Prehooks
- [x] `env:status` — Print environment variable status
- [x] `validate:env` — Validate required admin keys before migrations
- [x] `predev`, `prebuild` — Run env:status before dev/build
- [x] `premigrate`, `premigrate:users` — Run validate:env before migrations
- [x] `migrate`, `migrate:users` — Execute migration scripts

---

## ❌ Missing (PIVOT Phase — Critical for Production Cutover)

### P0 (Day 1) — Blocking All Subsequent Work

#### 1. Decision Log
**File**: `DECISION_LOG.md`  
**Purpose**: Track Track A commitment, abort criteria, rollback decisions  
**Status**: ❌ Not created  
**Impact**: No audit trail for irreversible decisions  
**Effort**: 30 minutes

#### 2. Supabase Snapshot Oracle
**Files**:
- `scripts/supabase-snapshot-oracle.ts` — Export immutable schema fingerprint, row counts, md5 checksums, computed aggregates
- `db/oracle-prepivot.json` — Ground truth for pre-migration state

**Status**: ❌ Not implemented  
**Impact**: Zero data validation baseline; cannot verify Cloud SQL migration integrity  
**Acceptance Criteria**:
- Row counts ±0 rows
- Computed fields (SRS totals) ±0.01
- Automatic abort on validator failure

**Effort**: 2 hours  
**Dependencies**: None (can run immediately)  
**Blockers Removed**: Enables `cloud-sql-validator.ts` to verify post-migration data integrity

---

### P1 (Days 2–3) — Parallelizable Workstreams

#### 3. Local Staging Mirror (Docker Compose)
**Files**:
- `docker-compose.staging.yml` — Local Postgres + Deno container + mock JWKS (1:1 production replica)
- `scripts/replay-production-requests.ts` — Replay captured requests against Supabase and staging; fail on diffs

**Status**: ❌ Not implemented  
**Impact**: Cloud Run cold starts, JWKS behavior, DB connectivity unquantified; function runtime unknown  
**Acceptance Criteria**:
- 99%+ replay match (100/100 preferred for critical endpoints)
- Latency parity: Cloud Run p99 ≤ Supabase p99 + 50ms

**Effort**: 6 hours  
**Dependencies**: None (parallelizable with Network Contract)  
**Blockers Removed**: Validates function runtime behavior, eliminates cold start blind spots

#### 4. Network & Secrets Contract → Terraform
**Files**:
- `gcp/network-contract.yaml` — Declarative spec (VPC, subnet, connector, secrets, IAM bindings)
- `scripts/generate-terraform.ts` — Generate `gcp/main.tf` from YAML contract
- `scripts/validate-infrastructure.sh` — Run `terraform plan` and connectivity dry-run checks
- `gcp/main.tf` — Generated Terraform configuration

**Status**: ❌ Not implemented  
**Impact**: Infrastructure changes untestable; network/secret access undeclared  
**Acceptance Criteria**:
- `terraform plan` produces expected resources
- Dry-run connectivity test (Cloud Run → Cloud SQL private IP) succeeds

**Effort**: 4 hours  
**Dependencies**: None (parallelizable with Local Staging Mirror)  
**Blockers Removed**: Makes infrastructure declarative, testable, versionable

---

### P2 (Day 4–5) — Post-Provisioning Validation

#### 5. Cloud SQL Validator
**File**: `scripts/cloud-sql-validator.ts`  
**Purpose**: Compare Cloud SQL data to `oracle-prepivot.json` (row counts, computed field tolerances)  
**Status**: ❌ Not implemented  
**Impact**: Cannot verify Cloud SQL migration integrity; no automated rollback trigger  
**Acceptance Criteria**:
- Row counts match ±0 rows
- Computed fields match ±0.01
- Automatic abort on divergence

**Effort**: 1 hour  
**Dependencies**: Requires `oracle-prepivot.json` (Snapshot Oracle)  
**Blockers Removed**: Enables automated post-migration validation

#### 6. Infrastructure Validation Script
**File**: `scripts/validate-infrastructure.sh`  
**Purpose**: Runs `terraform plan` and connectivity dry-run checks  
**Status**: ❌ Not implemented  
**Impact**: Cannot validate Terraform-generated infrastructure before provisioning  
**Effort**: 1 hour  
**Dependencies**: Requires `gcp/main.tf` (Network Contract)

---

## 🟡 Partially Addressed (Requires Extension)

### Reversible Cutover Protocol
**Current State**: ENV_VARS.md documents `.env` pattern; EDGIFY_MIGRATION.md describes dual-write strategy  
**PIVOT Requirements**:
- Phase A — Shadow Reads (validate reads only; abort if mismatch rate >0.5%)
- Phase B — Write-Both (dual writes with background comparator; abort on divergence)
- Phase C — Switch (irreversible after 24h clean metrics)

**Gaps**:
- ❌ No shadow read infrastructure (feature-flag, traffic mirror, response comparator)
- ❌ No write-both implementation (dual-write logic, background comparator)
- ❌ No automated abort triggers (mismatch rate monitors, divergence alerts)

**Effort**: 8–12 hours (3 phases)  
**Dependencies**: Requires Local Staging Mirror + Snapshot Oracle

---

## Highest-Leverage Fixes (Prioritized by Unblocking Power)

### 🔥 Tier 1 (Critical Path — Execute First)
1. **Snapshot Oracle** (2h) → Unlocks all data validation; enables Cloud SQL validator  
   - Creates immutable ground truth (`db/oracle-prepivot.json`)
   - Enables row count/checksum verification
   - Blocks: P2 validator scripts

2. **DECISION_LOG.md** (30min) → Audit trail for irreversible decisions  
   - Documents Track A commitment, abort criteria, rollback decisions
   - Required for production cutover protocol

### 🔧 Tier 2 (Parallel Workstreams — Day 2–3)
3. **Local Staging Mirror** (6h) → Validates function runtime behavior  
   - Eliminates cold start/JWKS/DB connectivity blind spots
   - Enables deterministic replay tests
   - Parallel with Network Contract

4. **Network Contract + Terraform** (4h) → Makes infrastructure testable  
   - Declarative VPC/subnet/connector/secrets
   - Enables dry-run validation before provisioning
   - Parallel with Local Staging Mirror

### 🛡️ Tier 3 (Post-Provisioning — Day 4–5)
5. **Cloud SQL Validator** (1h) → Automated post-migration checks  
   - Requires: `oracle-prepivot.json`
   - Validates row counts, computed fields, triggers rollback on divergence

6. **Infrastructure Validator** (1h) → Pre-provisioning sanity checks  
   - Requires: `gcp/main.tf`
   - Runs `terraform plan` + connectivity dry-run

---

## Gap Summary by Category

| Category | Implemented | Missing | Coverage |
|----------|-------------|---------|----------|
| **Firebase Infrastructure** | 13/13 files | 0 | ✅ 100% |
| **Environment Management** | 6/6 files | 0 | ✅ 100% |
| **Migration Scripts** | 2/4 files | 2 (oracle, validator) | 🟡 50% |
| **Validation Tools** | 2/5 scripts | 3 (replay, cloud-sql-validator, infra-validator) | 🟡 40% |
| **Infrastructure as Code** | 0/4 files | 4 (docker-compose, network-contract, terraform, validation) | ❌ 0% |
| **Cutover Protocol** | 0/3 phases | 3 (shadow reads, write-both, switch) | ❌ 0% |
| **Decision Tracking** | 0/1 files | 1 (DECISION_LOG.md) | ❌ 0% |

**Overall**: 23/36 components (64% complete)  
**Critical Path Blockers**: 6 P0/P1 items (Snapshot Oracle, Local Staging Mirror, Network Contract, DECISION_LOG, validators)

---

## Risk Assessment

### Current State (Without PIVOT Interventions)
- **Data Validation Risk**: 🔴 HIGH — No baseline; cannot verify Cloud SQL integrity
- **Function Runtime Risk**: 🔴 HIGH — Cold starts, JWKS, DB connectivity unquantified
- **Infrastructure Risk**: 🟡 MEDIUM — Manual provisioning; network/secret access undeclared
- **Reversibility Risk**: 🟡 MEDIUM — Rollback strategy documented but untested
- **Execution Confidence**: 🟡 6.5/10 — Premature execution without validation tooling

### Target State (After PIVOT Interventions)
- **Data Validation Risk**: 🟢 LOW — Snapshot Oracle + Cloud SQL validator (±0 rows, ±0.01 computed)
- **Function Runtime Risk**: 🟢 LOW — Local Staging Mirror + replay tests (99%+ match, latency parity)
- **Infrastructure Risk**: 🟢 LOW — Terraform + dry-run validation (declarative, testable)
- **Reversibility Risk**: 🟢 LOW — Tested RTO <5 min, automated abort triggers
- **Execution Confidence**: 🟢 9+/10 — Surgical precision, zero-trust validation

---

## Recommended Execution Sequence

### Week 1 (Parallel Streams)
**Day 1** (P0 — Sequential)
1. Create `DECISION_LOG.md` (30min)
2. Implement `scripts/supabase-snapshot-oracle.ts` (2h)
3. Run Snapshot Oracle, upload `db/oracle-prepivot.json` to GCS

**Day 2–3** (P1 — Parallel)
- Stream A: Implement `docker-compose.staging.yml` + `scripts/replay-production-requests.ts` (6h)
- Stream B: Write `gcp/network-contract.yaml` + `scripts/generate-terraform.ts` + `scripts/validate-infrastructure.sh` (4h)

### Week 2 (Post-Provisioning)
**Day 4**
- Implement `scripts/cloud-sql-validator.ts` (1h)
- Provision infrastructure (`terraform apply`)
- Migrate sample data (`pg_restore`)
- Run Cloud SQL validator

**Day 5**
- Phase A: Shadow reads (24h monitoring)
- Phase B: Write-both pilot
- Phase C: Full cutover (if metrics clean)

---

## Actionable Next Steps

1. **Immediate** (This Session):
   - Create `DECISION_LOG.md` template
   - Scaffold `scripts/supabase-snapshot-oracle.ts` (basic structure)
   - Add TODO comments for missing P1/P2 scripts

2. **Next Session** (Day 1):
   - Complete Snapshot Oracle implementation
   - Run oracle, generate `db/oracle-prepivot.json`
   - Validate against current Supabase data

3. **Day 2–3** (Parallel Execution):
   - Assign Stream A (Local Staging Mirror) to Backend team
   - Assign Stream B (Network Contract) to DevOps team
   - Daily standups to track parallel progress

4. **Day 4–5** (Validation + Cutover):
   - Execute Cloud SQL validator
   - Run Phase A shadow reads
   - Monitor metrics; proceed to Phase B/C if clean

---

## Tool Inventory (For Reference)

### Existing Tools (EDGIFY Phase)
```bash
npm run env:status          # Print environment variable status
npm run validate:env        # Validate admin keys before migrations
npm run migrate             # Migrate flashcards/progress to Firestore
npm run migrate:users       # Migrate Supabase auth users to Firebase
```

### Missing Tools (PIVOT Phase)
```bash
npm run oracle:snapshot     # Generate oracle-prepivot.json (❌ missing)
npm run oracle:validate     # Validate Cloud SQL vs. oracle (❌ missing)
npm run staging:up          # Start docker-compose.staging.yml (❌ missing)
npm run replay:requests     # Replay production requests (❌ missing)
npm run infra:generate      # Generate gcp/main.tf from contract (❌ missing)
npm run infra:validate      # Run terraform plan + dry-run (❌ missing)
```

---

## Conclusion

**Current Status**: Firebase migration **foundation complete** (40% overall); production cutover tooling **absent**.

**Critical Path**: Implement Snapshot Oracle (2h) → unlocks Cloud SQL validator → enables data integrity validation → raises confidence from 6.5/10 to 9+/10.

**Parallelization Opportunity**: Local Staging Mirror (6h) + Network Contract (4h) can run simultaneously after Snapshot Oracle (Day 2–3).

**Risk Mitigation**: Adding 6 P0/P1 interventions removes ambiguity, enables reversibility testing, and provides zero-trust validation before irreversible cutover.

**Recommendation**: Execute Tier 1 (Snapshot Oracle + DECISION_LOG) immediately; schedule Tier 2 (Staging Mirror + Network Contract) for Day 2–3; defer Tier 3 until infrastructure provisioned.
