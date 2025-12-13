tem	Value / Command	Notes (reproducible)
Firebase Project ID	gulfara-cards	Use this project for all steps below.
Firestore region	nam5	Chosen during init — use same region for indexes & emulators.
Features to enable	Firestore, Auth, Functions (TypeScript + ESLint), Storage, Remote Config, Data Connect (BigQuery), Emulators, Hosting (App)	Enable when running firebase init for gulfara/.
Local env file	.env ← copy from .env.example	Populate all keys below; file must remain gitignored.
Required env vars (client + admin)	NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID, NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (opt), NEXT_PUBLIC_USE_FIREBASE=true, NEXT_PUBLIC_DUAL_WRITE_MODE=false, FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY (PEM with \n escaped)	Put all values into gulfara/.env. Private key must be escaped newlines.
Create service account	Generate via Firebase Console → Project Settings → Service accounts → Create new key (JSON)	Do NOT commit JSON. Extract project_id, client_email, private_key into .env.
firebase init (minimal command sequence)	npx firebase login<br>cd gulfara<br>npx firebase init firestore auth functions storage remoteconfig hosting dataconnect emulators	When prompted: choose existing project (gulfara-cards), Firestore rules file = firestore.rules, indexes file = firestore.indexes.json, Functions language = TypeScript, enable ESLint = Yes. For Data Connect choose gulfara (admin_node) and gulfara (web) apps.
Firestore rules file	firestore.rules	Put rules in repo; deploy with firebase CLI.
Firestore indexes file	firestore.indexes.json	Put indexes in repo; deploy with firebase CLI.
Functions setup	TypeScript + ESLint	Place server-only admin code in functions (use firebase-admin SDK there).
Initialize emulators	firebase emulators:start --only firestore,auth,functions,storage,remoteconfig	Use for local dev, replay harness, and smoke tests.
Deploy rules & indexes	firebase deploy --only firestore:rules,firestore:indexes	Run before functions/hosting to ensure queries work.
Deploy functions + storage	firebase deploy --only functions,storage	Use when functions pass emulator smoke tests.
Deploy full stack (if hosting on Firebase)	firebase deploy --only hosting,functions,firestore:rules,firestore:indexes,storage,remoteconfig	Use for app hosting; otherwise keep Vercel for Next and deploy only backend pieces.
Emulator-based smoke tests	Start emulators → run signup/login flows → call Server Actions (setup-user, createFlashcard, migrate-session)	Verify Firestore docs, auth flows, and compute results.
Data Connect / BigQuery	Enable in firebase init / console; configure export to BigQuery	Use for analytics, oracle comparisons and deterministic validation.
Logging & analytics	NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID set & getAnalytics initialized in client	Optional; set measurement id in .env if used.
Quick validation script	npm run env:status / npm run validate:env	Use repo scripts to verify required env keys before running migrations or deploys.
Important security reminder	Do not commit .env or service account JSON	Put production secrets in Vercel/Firebase secret manager.