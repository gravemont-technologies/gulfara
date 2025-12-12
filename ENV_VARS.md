# Environment Variables (single `.env`) — Gulfara

This file documents the canonical environment variables used by the `gulfara/` app. We use a single `.env` for local development (contains both public and private entries) and keep `.env` in `.gitignore` so secrets are never committed.

Format: copy `./.env.example` → `./.env` and fill values.

-------------------------

## Public / Browser-exposed variables (prefixed `NEXT_PUBLIC_` or `VITE_`)
These values are safe for the client bundle and are intended to be readable in browser/runtime.

> **[ARCHIVED]**: Supabase-related env names are kept for historical reference.
> The active persistence layer is Firebase; prefer `FIREBASE_*`/`NEXT_PUBLIC_FIREBASE_*`.

- `VITE_SUPABASE_URL`  
  - Purpose: Supabase API URL (public).  
  - Used by: `src/supabase/clientStandalone.js`, server APIs that fallback to VITE_* values.
  - Required: yes (development)

- `VITE_SUPABASE_ANON_KEY`  
  - Purpose: Supabase anon/public key for client usage.  
  - Used by: client-side Supabase code, tests.
  - Required: yes (development)

- `NEXT_PUBLIC_FIREBASE_API_KEY`  
  - Purpose: Firebase client API key (public).  
  - Used by: `lib/firebase/config.ts`, client auth and Firestore client initialization.
  - Required: yes if using Firebase client features.

- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`  
  - Purpose: Firebase auth domain.  
  - Used by: `lib/firebase/config.ts`.

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  
  - Purpose: Firebase project id (public).  
  - Used by: `lib/firebase/config.ts`, `scripts/log-env.cjs` (preflight).  
  - Required: yes if using Firebase.

- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`  
  - Purpose: Firebase storage bucket (public).  
  - Used by: any storage features.

- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`  
  - Purpose: Firebase messaging sender id.

- `NEXT_PUBLIC_FIREBASE_APP_ID`  
  - Purpose: Firebase app id.

- `NEXT_PUBLIC_USE_FIREBASE`  
  - Purpose: Feature flag to enable Firebase usage in the app.  
  - Used by: `app/api/health/route.ts` and runtime checks.

- `NEXT_PUBLIC_DUAL_WRITE_MODE`  
  - Purpose: Toggle dual-write mode for testing/rollbacks.

- `VITE_CLERK_PUBLISHABLE_KEY`  
  - Purpose: Clerk publishable key (auth).  
  - Used by: client auth components.

- `VITE_USE_EDGE_REVIEW` and `VITE_USE_EDGE_AI_PROXY`  
  - Purpose: Feature flags used by the app to enable edge routes.

- `VITE_APP_BASE_URL`  
  - Purpose: Local base URL (dev/preview).  
  - Used by: docs, tests, Playwright config.

-------------------------

## Private / Server-only variables (keep in `.env`, do NOT commit)
These variables must remain secret. They are accessed only on server runtime (Node, server actions, scripts). The single `.env` approach stores them locally and is gitignored.

- `FIREBASE_ADMIN_PROJECT_ID`  
  - Purpose: Service account project id for Firebase Admin SDK.  
  - Used by: `lib/firebase/admin.ts`, `scripts/migrate-*.ts`.

- `FIREBASE_ADMIN_CLIENT_EMAIL`  
  - Purpose: Service account client email for Firebase Admin SDK.

- `FIREBASE_ADMIN_PRIVATE_KEY`  
  - Purpose: Service account private key (PEM). Must preserve newlines as `\n` when stored inline.
  - Usage note: When placing in `.env`, wrap in quotes and represent newlines as `\n` (example in `.env.example`). Code replaces `\\n` with actual newline when initializing admin SDK.

- `SUPABASE_SERVICE_ROLE_KEY`  
  - Purpose: Supabase service role key for privileged server operations.  
  - Used by: `scripts/migrate-data.ts`, `scripts/migrate-users.ts`, server APIs that require admin privileges.

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`  
  - Purpose: Alternative names used by some server APIs (`process.env.SUPABASE_URL`) and tests. The repo supports both `VITE_` and non-prefixed names — fill both if you use both runtimes.

- `OPENAI_API_KEY`  
  - Purpose: OpenAI secret used by server-side AI proxy routes (`api/ai-proxy.ts`).

- `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`  
  - Purpose: Clerk server-side keys used by webhook verification and server SDKs.

- `PLAYWRIGHT_BASE_URL`  
  - Purpose: Overrides base URL used by Playwright tests (optional).

-------------------------

## Where these are consumed (quick reference)
- Firebase client: `lib/firebase/config.ts`  
- Firebase admin: `lib/firebase/admin.ts`, `scripts/migrate-data.ts`, `scripts/migrate-users.ts`  
- Supabase client (server): `api/*.ts`, `functions/*`, `scripts/*` using `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_URL`  
- Client-side Supabase: `src/supabase/clientStandalone.js` uses `VITE_SUPABASE_*` or `process.env.*` fallback  
- Preflight check: `scripts/log-env.cjs` prints status for selected keys  

-------------------------

## Recommended local workflow
1. Copy the template and edit values:

```cmd
cd gulfara
copy .env.example .env
rem edit .env and fill values (use an editor)
```

2. Verify preflight: (this runs automatically before `dev` or `build`)

```cmd
npm run env:status
```

3. Start dev server:

```cmd
npm run dev
```

4. Run migrations (only after verifying admin keys in `.env`):

```cmd
npm run migrate
npm run migrate:users
```

-------------------------

## Notes / gotchas
- The repo supports both `VITE_` prefixed env names (for Vite/Client) and unprefixed `SUPABASE_*` names used by scripts and server routes; to be safe fill both forms in `.env` if you run both client and server locally.
- Keep `.env` in `.gitignore`. Never commit `FIREBASE_ADMIN_PRIVATE_KEY` or other secrets.
- When pasting a service-account private key into `.env`, replace newlines with `\n` and wrap the value in quotes; the admin initializer will `replace(/\\n/g, '\n')` when reading the value.

-------------------------

If you want, I can now:
- add a short script to validate the Firebase admin key format before running migrations, or
- add a `gulfara/ENV_VARS_SUMMARY.txt` to surface the same info in CI logs.

Which would you prefer? 
