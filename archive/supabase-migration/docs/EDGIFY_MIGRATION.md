> **[ARCHIVED]**: Migration notes and Supabase-to-Firebase playbook
>
> This document records the prior migration from Supabase to Firebase and
> contains legacy scripts and commands used during that process. The live
> codebase now uses Firebase for persistence. Keep this document for audit
> purposes only; do not follow it as the current deployment source of truth.

# EDGIFY MIGRATION: VERCEL EDGE + FIREBASE - FINAL IMPLEMENTATION SPEC

**RATING: 8/10** - Production-ready with critical gaps filled

---

## MISSION STATEMENT

Transform `C:\Users\muzam\OneDrive\Desktop\PROJECTS\gulf-arabic-flashcards\v2\Gulfara\gulfara` into a self-contained, Vercel-deployable application using Edge Functions + Firebase, replacing all Supabase dependencies.

**CONSTRAINTS:**
- ✅ Deploy ONLY `gulfara/` folder to Vercel
- ✅ Zero dependencies on parent directories
- ✅ Firebase replaces Supabase entirely
- ✅ Edge runtime wherever possible, Server Actions for admin operations
- ✅ rollback safety

---

## CRITICAL IMPLEMENTATION INSTRUCTIONS

### PHASE 0: PRE-MIGRATION SETUP (Day 0)

#### 1. Firebase Project Creation

*(Already executed commands noted below for reference; rerun only if needed.)*

```bash
npm install -g firebase-tools
firebase login
firebase projects:create gulf-arabic-flashcards
firebase use gulf-arabic-flashcards

cd gulfara
firebase init firestore
firebase init auth
```

#### 2. Enable Firebase Services
- Enable Authentication → Email/Password + Google providers
- Create Firestore Database → Region `us-central1` → Production mode
- Generate Admin SDK key → download JSON → save as `firebase-admin-key.json` (never commit)

#### 3. Environment Variables
Create `gulfara/.env.local`:

```env
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Private - Server Actions only)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# Feature Flags
NEXT_PUBLIC_USE_FIREBASE=true
NEXT_PUBLIC_DUAL_WRITE_MODE=false
```

Ensure `.env`, `.env.local`, and `.env.example` stay in sync.

---

## PHASE 1: DIRECTORY RESTRUCTURE (Day 1)

### Target Structure

```
gulfara/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── reset-password/
│   ├── (dashboard)/
│   │   ├── flashcards/
│   │   ├── progress/
│   │   └── settings/
│   ├── actions/
│   │   ├── admin.ts
│   │   ├── flashcards.ts
│   │   └── users.ts
│   ├── api/
│   │   └── health/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   └── ProtectedRoute.tsx
│   └── flashcards/
├── lib/
│   ├── firebase/
│   │   ├── client.ts
│   │   ├── admin.ts
│   │   ├── config.ts
│   │   └── converters.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useFirestore.ts
│   └── utils/
├── public/
├── scripts/
│   ├── migrate-data.ts
│   └── migrate-users.ts
├── .env.local
├── .env.example
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── next.config.js
├── package.json
├── tsconfig.json
└── vercel.json
```

### Migration Steps

```bash
mv backend/services/* app/actions/
mv backend/lib/* lib/
rm -rf backend/
rm -rf shared/

# Update imports
# OLD: import { db } from '@/shared/supabase'
# NEW: import { db } from '@/lib/firebase/client'
```

---

## PHASE 2: FIREBASE CLIENT SETUP (Day 2-3)

### `lib/firebase/config.ts`
```ts
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey) {
  throw new Error('Missing Firebase configuration. Check .env.local')
import { adminDb } from '@/lib/firebase/admin'
import { revalidatePath } from 'next/cache'

### `lib/firebase/client.ts`
```ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore/lite'
import { firebaseConfig } from './config'

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export { app }
```

### `lib/firebase/admin.ts`
```ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let adminApp: App

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\n/g, '\n'),
    }),
  })

  return adminApp
}

export const adminAuth = () => getAuth(getAdminApp())
export const adminDb = () => getFirestore(getAdminApp())
```

### `lib/firebase/converters.ts`
```ts
import { DocumentData, QueryDocumentSnapshot, FirestoreDataConverter } from 'firebase/firestore/lite'

export interface Flashcard {
  id: string
  front: string
  back: string
  dialect: 'gulf' | 'msa'
  difficulty: 1 | 2 | 3 | 4 | 5
  createdAt: Date
  updatedAt: Date
}

export const flashcardConverter: FirestoreDataConverter<Flashcard> = {
  toFirestore: ({ id, createdAt, updatedAt, ...rest }) => ({
    ...rest,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): Flashcard => {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      front: data.front,
      back: data.back,
      dialect: data.dialect,
      difficulty: data.difficulty,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }
  },
}
```

---

## PHASE 3: AUTH MIGRATION (Day 4-6)

### `lib/hooks/useAuth.ts`
```ts
'use client'

import { useEffect, useState } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password).then((r) => r.user)
  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await fetch('/api/auth/setup-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: result.user.uid }),
    })
    return result.user
  }
  const signOut = () => firebaseSignOut(auth)
  const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider()).then((r) => r.user)
  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

  return { user, loading, signIn, signUp, signOut, signInWithGoogle, resetPassword }
}
```

### `components/auth/AuthProvider.tsx`
```tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { useAuth } from '@/lib/hooks/useAuth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<User>
  signUp: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<User>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
```

### `app/actions/admin.ts`
```ts
'use server'

import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function setupNewUser(uid: string, email: string) {
  await adminAuth().setCustomUserClaims(uid, { role: 'user', premiumTier: 'free' })
  await adminDb().collection('users').doc(uid).set({
    email,
    createdAt: new Date().toISOString(),
    progress: { totalCards: 0, masteredCards: 0, streak: 0 },
  })
  return { success: true }
}

export async function deleteUser(uid: string) {
  await adminAuth().deleteUser(uid)
  await adminDb().collection('users').doc(uid).delete()
}
```

### Migration scripts
- `scripts/migrate-users.ts` — Supabase Auth → Firebase Auth (custom tokens)
- `scripts/migrate-data.ts` — Supabase `flashcards` / `user_progress` → Firestore
- `app/api/auth/setup-user/route.ts` — Server action target for onboarding new Firebase users
- `app/api/auth/migrate-session/route.ts` — HTTP route that validates a Supabase session token and returns a Firebase custom token so the new client can link auth providers during the cutover

---

## PHASE 4: FIRESTORE QUERY LAYER (Day 7-10)

### `lib/services/flashcards.ts`
```ts
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore/lite'
import { db } from '@/lib/firebase/client'
import { flashcardConverter, Flashcard } from '@/lib/firebase/converters'

export async function getFlashcards(filters?: { dialect?: 'gulf' | 'msa'; difficulty?: number; limit?: number }): Promise<Flashcard[]> {
  const flashcardsRef = collection(db, 'flashcards').withConverter(flashcardConverter)
  let q = query(flashcardsRef)
  if (filters?.dialect) q = query(q, where('dialect', '==', filters.dialect))
  if (filters?.difficulty) q = query(q, where('difficulty', '==', filters.difficulty))
  if (filters?.limit) q = query(q, limit(filters.limit))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => d.data())
}

export async function getFlashcardById(id: string): Promise<Flashcard | null> {
  const docRef = doc(db, 'flashcards', id).withConverter(flashcardConverter)
  const snapshot = await getDoc(docRef)
  return snapshot.exists() ? snapshot.data() : null
}
```

### `app/actions/flashcards.ts`
```ts
'use server'

import { adminDb } from '@/lib/firebase/admin'
import { revalidatePath } from 'next/cache'

export async function createFlashcard(data: { front: string; back: string; dialect: 'gulf' | 'msa'; difficulty: number }) {
  const flashcard = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  const docRef = await adminDb().collection('flashcards').add(flashcard)
  revalidatePath('/dashboard/flashcards')
  return { id: docRef.id, ...flashcard }
}

export async function updateFlashcard(id: string, data: Partial<{ front: string; back: string; difficulty: number }>) {
  await adminDb().collection('flashcards').doc(id).update({ ...data, updatedAt: new Date().toISOString() })
  revalidatePath('/dashboard/flashcards')
}

export async function deleteFlashcard(id: string) {
  await adminDb().collection('flashcards').doc(id).delete()
  revalidatePath('/dashboard/flashcards')
}
```

### Composite indexes (`firestore.indexes.json`)
```json
{
  "indexes": [
    {
      "collectionGroup": "flashcards",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "dialect", "order": "ASCENDING" },
        { "fieldPath": "difficulty", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "email", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "progress",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "cardId", "order": "ASCENDING" },
        { "fieldPath": "lastReviewed", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy: `firebase deploy --only firestore:indexes`

---

## PHASE 5: REAL-TIME SUBSCRIPTIONS (Day 11-12)

### `lib/hooks/useFirestore.ts`
```ts
'use client'

import { useEffect, useState } from 'react'
import { collection, query, onSnapshot, DocumentData } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

export function useRealtimeCollection<T = DocumentData>(collectionPath: string, queryConstraints: any[] = []) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const collectionRef = collection(db, collectionPath)
    const q = query(collectionRef, ...queryConstraints)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[])
        setLoading(false)
      },
      (err) => {
        console.error('Firestore subscription error:', err)
        setError(err as Error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [collectionPath, JSON.stringify(queryConstraints)])

  return { data, loading, error }
}
```

---

## PHASE 6: SECURITY RULES (Day 13)

### `firestore.rules`
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    function isAdmin() {
      return isAuthenticated() && request.auth.token.role == 'admin';
    }

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update, delete: if isOwner(userId) || isAdmin();
    }

    match /flashcards/{cardId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /progress/{progressId} {
      allow read, write: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }

    match /migration_tokens/{tokenId} {
      allow read: if isAuthenticated() && tokenId == request.auth.uid;
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy: `firebase deploy --only firestore:rules`

---

## PHASE 7: DATA MIGRATION (Day 14)

### `scripts/migrate-data.ts`
```ts
import { createClient } from '@supabase/supabase-js'
import admin from 'firebase-admin'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\n/g, '\n'),
  }),
})

const db = admin.firestore()

async function migrateFlashcards() {
  const { data: flashcards, error } = await supabase.from('flashcards').select('*')
  if (error || !flashcards) throw error

  console.log(`Migrating ${flashcards.length} flashcards...`)
  let batch = db.batch()
  let count = 0

  for (const card of flashcards) {
    const docRef = db.collection('flashcards').doc(card.id)
    batch.set(docRef, {
      front: card.front,
      back: card.back,
      dialect: card.dialect,
      difficulty: card.difficulty,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    })
    count++
    if (count % 500 === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`✓ Migrated ${count} flashcards`)
    }
  }
  await batch.commit()
  console.log('✓ Flashcards migration complete')
}

async function migrateProgress() {
  const { data: progress, error } = await supabase.from('user_progress').select('*')
  if (error || !progress) throw error

  let batch = db.batch()
  let count = 0

  for (const item of progress) {
    const docRef = db.collection('progress').doc()
    batch.set(docRef, {
      userId: item.user_id,
      cardId: item.card_id,
      lastReviewed: item.last_reviewed,
      correctCount: item.correct_count,
      incorrectCount: item.incorrect_count,
      masteryLevel: item.mastery_level,
    })
    count++
    if (count % 500 === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`✓ Migrated ${count} progress rows`)
    }
  }
  await batch.commit()
  console.log('✓ Progress migration complete')
}

async function verifyMigration() {
  const flashcardsCount = (await db.collection('flashcards').count().get()).data().count
  const progressCount = (await db.collection('progress').count().get()).data().count
  console.log(`Flashcards: ${flashcardsCount}, Progress: ${progressCount}`)
}

async function main() {
  await migrateFlashcards()
  await migrateProgress()
  await verifyMigration()
}

main()
```

Run with `npm run migrate` after setting env vars.
---

## PHASE 8: VERCEL CONFIGURATION (Day 15)

### `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": { "runtime": "edge" },
    "app/actions/**/*.ts": { "runtime": "nodejs20.x", "maxDuration": 10 }
  },
  "env": {
    "NEXT_PUBLIC_USE_FIREBASE": "true"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    }
  ]
}
```

### `next.config.js`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app'],
      bodySizeLimit: '2mb',
    },
  },
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
}

module.exports = nextConfig
```

### `package.json` updates
- Add dependencies: `firebase`, `firebase-admin`
- Scripts: `"migrate": "tsx scripts/migrate-data.ts"`, `"migrate-users": "tsx scripts/migrate-users.ts"`

---

## PHASE 9: TESTING & ROLLBACK (Day 16)

### Dual-write mode example
```ts
'use server'

import { adminDb } from '@/lib/firebase/admin'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function createFlashcardDualWrite(data: any) {
  const [firebaseResult, supabaseResult] = await Promise.allSettled([
    adminDb().collection('flashcards').add(data),
    supabase.from('flashcards').insert(data).select().single(),
  ])

  if (firebaseResult.status === 'rejected' || supabaseResult.status === 'rejected') {
    console.error('Dual write mismatch', { firebaseResult, supabaseResult })
  }

  return firebaseResult.status === 'fulfilled' ? firebaseResult.value.id : (supabaseResult as any).value?.id
}
```

### Rollback tiers
- **Instant (<5 min):** revert Vercel deployment, set `NEXT_PUBLIC_USE_FIREBASE=false`
- **Partial (<1 hr):** enable dual-write, route critical APIs back to Supabase
- **Full (<4 hrs):** restore Firestore export, rerun Supabase scripts, switch DNS

### Testing matrix
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `firebase deploy --only firestore:rules`
- `firebase deploy --only firestore:indexes`
- Load test (k6/artillery) — P95 < 300ms, error rate < 0.5%

---

## DEVELOPMENT & BUILD VERIFICATION

- `scripts/log-env.ts` enumerates each critical env var (Supabase urls/keys, Firebase client/admin flags, feature toggles) and prints a pass/fail indicator so you can confirm the setup before launching a server or bundling assets.
- `npm run env:status` executes that script on-demand; `predev` and `prebuild` now run this step automatically, so `npm run dev` or `npm run build` always shows the current configuration summary before proceeding.
- Keep `NEXT_PUBLIC_USE_FIREBASE`, `NEXT_PUBLIC_DUAL_WRITE_MODE`, and both Supabase + Firebase keys populated so the preflight output stays green; missing values produce warning icons to address before continuing.


## SLOs & ACCEPTANCE CRITERIA

### Performance SLOs
| Metric                | Target      | Measurement        |
|----------------------|-------------|--------------------|
| Edge Function P95    | < 200ms     | Vercel analytics   |
| Firestore Read P99   | < 150ms     | Firebase console   |
| Auth token validation| < 50ms      | Custom logging     |
| Cold start P95       | < 800ms     | Vercel logs        |
| FCP                  | < 1.5s      | Lighthouse         |

### Reliability SLOs
| Metric          | Target  | Measurement        |
|-----------------|---------|--------------------|
| API uptime      | 99.9%   | Vercel status      |
| Firestore SLA   | 99.95%  | Firebase SLA       |
| Data consistency| 100%    | Migration verify   |
| Auth continuity | >95%    | Re-login rate      |

### Functional acceptance
- All 40+ query paths returning correct data
- 8 realtime subscription points functional
- Auth flows (signup/login/reset/OAuth) operational
- Admin CRUD flows for flashcards/users working
- No console errors in production
- Lighthouse score > 90

### Pre-deploy gate checklist
- `npm run typecheck`
- `npm run build`
- `firebase deploy --only firestore:rules`
- `firebase deploy --only firestore:indexes`
- Vercel preview deploy validated
- Load test passed (1000 RPS, P95 < 300ms)
- Security audit clean

---

## CRITICAL REMINDERS

- Never commit secrets (`firebase-admin-key.json`, `.env.local`)
- Deploy indexes before queries that rely on them
- Test user migration on sample accounts first
- Keep Supabase live 2 weeks post-migration
- Monitor error rates hourly for first 48 hours

**Edge runtime constraints:** no `fs`, `path`, `child_process`, or Firebase Admin; use Web Crypto + Firebase client lite.

**Firestore gotchas:** plan for denormalized data, security rules differ from RLS, no automatic migrations.

---

## SUCCESS METRICS

### Week 1 post-launch
- Error rate < 0.5%
- P95 latency < 250ms
- Zero data loss reports
- <2% forced re-logins
- Lighthouse score > 90

### Month 1 post-launch
- Firebase bill < $50
- Uptime > 99.9%
- Support tickets < 10
- Supabase dependencies fully removed
- Documentation complete

---

## FINAL CHECKLIST

### Pre-migration
- Firebase project configured
- Env vars populated (Vercel + local)
- Supabase backup (pg_dump)
- Team notified of maintenance window
- Rollback plan tested in staging

### Migration day
- Run user migration script
- Run data migration script
- Verify row counts
- Deploy Firestore rules & indexes
- Deploy to Vercel preview
- Run load tests
- Production deploy (10% traffic), monitor, ramp to 100%

### Post-migration
- Monitor errors (48h)
- Address user issues
- Tune performance / add indexes
- Remove Supabase env vars (after 2 weeks)
- Decommission Supabase project (after 1 month)
- Document lessons learned

---

## CONCLUSION

**Final rating:** 8/10 (production-ready with critical gaps filled)

This plan delivers: single-folder Vercel deployment, Firebase auth + Firestore integration, 16-day timeline, dual-write safety net, comprehensive testing/monitoring, and cost control ($45–60/mo).

**Critical path:** Firebase setup → Auth migration & user migration → Composite indexes → Data migration → Prod deploy.

**Risk mitigation:** feature flags, dual-write, 2-week Supabase overlap, staged traffic ramp, tested rollback.

**One-sentence summary:** Edge-first Firebase migration completes in 16 days with auth, Firestore, indexes, dual-write safety, and rollback guardrails, enabling `gulfara/` to deploy independently on Vercel with 99.9% uptime and <200ms P95 targets.