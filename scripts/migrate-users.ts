import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import admin from 'firebase-admin'

const projectRoot = process.cwd()
loadEnvFiles()

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FIREBASE_ADMIN_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID
const FIREBASE_ADMIN_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const FIREBASE_ADMIN_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase credentials (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) are required')
}

if (!FIREBASE_ADMIN_PROJECT_ID || !FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY) {
  throw new Error('Firebase admin credentials (projectId, clientEmail, privateKey) are required')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const firebaseApp = admin.apps.length > 0 ? admin.app() : admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
})
const auth = firebaseApp.auth()
const db = firebaseApp.firestore()

async function migrateUser(user: { id: string; email?: string | null; email_confirmed_at?: string | null; created_at?: string | null }) {
  const uid = user.id
  const email = user.email ?? `${uid}@supabase.local`
  const emailVerified = Boolean(user.email_confirmed_at)

  try {
    await auth.getUser(uid)
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      await auth.createUser({
        uid,
        email,
        emailVerified,
        disabled: false,
      })
      console.log(`Created Firebase user for ${uid}`)
    } else {
      throw err
    }
  }

  await auth.setCustomUserClaims(uid, { role: 'user', premiumTier: 'free' })
  await db.collection('users').doc(uid).set(
    {
      email,
      emailVerified,
      migratedFrom: 'supabase',
      createdAt: user.created_at ?? new Date().toISOString(),
    },
    { merge: true }
  )
}

async function main() {
  const perPage = 100
  let page = 1
  let migrated = 0

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`Failed to list Supabase users: ${error.message}`)
    }
    const users = (data as any)?.users ?? data ?? []
    if (!users.length) {
      break
    }

    for (const user of users) {
      await migrateUser(user)
      migrated += 1
    }

    if (users.length < perPage) {
      break
    }
    page += 1
  }

  console.log(`Migrated ${migrated} users to Firebase`)
}

main().catch((err) => {
  console.error('User migration failed', err)
  process.exit(1)
})

function loadEnvFiles() {
  const file = path.join(projectRoot, '.env')
  if (!existsSync(file)) return
  const content = readFileSync(file, 'utf-8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const equalsIndex = line.indexOf('=')
    if (equalsIndex === -1) continue
    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}