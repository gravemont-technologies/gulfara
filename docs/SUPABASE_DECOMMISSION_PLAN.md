# Supabase Decommission Plan

## Objective
- Remove every Supabase dependency (code, docs, envs, scripts) and replace reversible paths with Firebase-native implementations (Firestore + Firebase Admin). 
- Keep functionality intact: review scoring, SRS persistence, API usage logging, migrations, docs, tooling.

## Inventory (reference points)
| Layer | Files / Paths | Role | Replacement idea |
| --- | --- | --- | --- |
| Edge Functions | `gulfara/functions/review/index.ts`, `functions/ai-proxy/index.ts`, `edge-functions.md` | SRS updates, user_progress, API usage logging, dual-write doc. | Use Firebase Admin SDK pointing at Firestore collections `srs_data`, `user_progress`, `user_api_usage` and update doc friction accordingly. |
| Server API | `gulfara/api/review.ts`, `app/api/.../migrate-session`, `api/ai-proxy.ts`, `api/sync.ts`, `tests/*` | Supabase client-based endpoints for practice sync, migrations, validations. | Replace with Firestore + Cloud SQL/Firestore combos, use helper wrappers instead of `createClient`. Update tests to mock Firebase/Firestore. |
| Front-end / Client | `gulfara/src/supabase/clientStandalone.js`, `vite.config`, `app/api` references, `tests/utils/mockSupabase.ts`, `gulfara/.env.example`, `.env`, `srs-gulfara/*` | Browser Supabase client for direct card reads and other operations. | Remove supabase client, rely on new Firebase-friendly APIs (REST or Cloud Functions). Update env templates accordingly. |
| Scripts / Tooling | `scripts/migrate-data.ts`, `migrate-users.ts`, `supabase-snapshot-oracle.ts`, `replay-production-requests.ts`, `seed-staging.sh`, `cloud-sql-validator.ts`, `validate-env.cjs`, `srs-gulfara/deploy.sh`, `srs-gulfara/DEPLOYMENT.md`, `db/PIVOT_TO_FIREBASE.md` | Tools for migration validation, data seeding, replication verification. | Rebuild or retire these scripts to target Cloud SQL / Firestore or remove (if functionality obsolete). Document new Firebase-only steps. |
| Schema / Docs | `db/schema.sql`, `supabase-schema.sql`, `gulfara/supabase-schema.sql`, `SUPABASE_PROFILE_SCHEMA.md`, `PRODUCT.md`, `srs-gulfara/` docs, `TESTING_STRATEGY.md`, `ENV_VARS.md` | Canonical DB schema referencing Supabase RLS / commenting. | Convert documentation to describe Cloud SQL + Firestore, remove Supabase-specific notes. Keep schema generic SQL for Postgres. |
| Dependencies | `gulfara/package.json`, `gulfara/srs-gulfara/package-lock.json`, `functions/`, `scripts/` import `@supabase/supabase-js` | Supabase JS packages. | Remove packages, replace with Firebase Admin / fetch or alternative clients. |

## Replacement strategy at a glance
1. **FireStore-first persistence**: Store SRS rows in Firestore collections (`srsData`, `userProgress`, `apiUsage`). Keep pre-existing SQL schema for Cloud SQL but stop using Supabase clients. Add helper wrappers in `functions/lib/firestoreClient.ts`.  
2. **API surface**: `gulfara/api/review.ts` and `functions/*` share logic. Introduce shared `gulfara/functions/lib/firestoreOps.ts` to read/write Firestore. Keep SRS engine logic intact. 
3. **Env cleanup**: Only keep Firebase envs (`NEXT_PUBLIC_*`, Firebase Admin). Drop `SUPABASE_*` entries from `.env.example`, docs, scripts.  
4. **Docs + tests**: Update README/PRODUCT/ENV docs to reflect Firebase-only architecture. Update tests to mock Firebase Admin instead of Supabase clients. Remove `mockSupabase.ts` or adapt to new mocks. 
5. **Tooling**: Either retire `supabase-snapshot-oracle.ts` / `seed-staging.sh` or rewrite them to work against Firestore/Cloud SQL. Document new steps. 

## Next steps (aligns with TODOs)
- Task 2 will replace edge functions with Firebase Admin logic.
- Task 3 will update `api/review.ts`, `api/ai-proxy.ts`, and relevant tests.
- Task 4 covers docs, env, client, and scripts.
- Task 5 removes package deps/config.

Once each task is done, cross-check this plan to ensure no hidden Supabase references remain.
