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
const db = firebaseApp.firestore()

async function migrateFlashcards() {
  const { data, error } = await supabase.from('flashcards').select('*')
  if (error || !data) {
    throw new Error(`Failed to fetch flashcards: ${error?.message ?? 'unknown error'}`)
  }

  console.log(`Migrating ${data.length} flashcards...`)
  let batch = db.batch()
  let count = 0

  for (const card of data) {
    const docRef = db.collection('flashcards').doc(card.id)
    batch.set(docRef, {
      front: card.front,
      back: card.back,
      dialect: card.dialect,
      difficulty: card.difficulty,
      createdAt: card.created_at ?? new Date().toISOString(),
      updatedAt: card.updated_at ?? new Date().toISOString(),
    })
    count += 1
    if (count % 500 === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`✓ Migrated ${count} flashcards`)
    }
  }

  if (count % 500 !== 0) {
    await batch.commit()
  }

  console.log('✓ Flashcards migration complete')
}

async function migrateProgress() {
  const { data, error } = await supabase.from('user_progress').select('*')
  if (error || !data) {
    throw new Error(`Failed to fetch progress: ${error?.message ?? 'unknown error'}`)
  }

  console.log(`Migrating ${data.length} progress rows...`)
  let batch = db.batch()
  let count = 0

  for (const item of data) {
    const docRef = db.collection('progress').doc()
    batch.set(docRef, {
      userId: item.user_id,
      cardId: item.card_id,
      lastReviewed: item.last_reviewed,
      correctCount: item.correct_count,
      incorrectCount: item.incorrect_count,
      masteryLevel: item.mastery_level,
      updatedAt: item.updated_at ?? new Date().toISOString(),
    })
    count += 1
    if (count % 500 === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`✓ Migrated ${count} progress rows`)
    }
  }

  if (count % 500 !== 0) {
    await batch.commit()
  }

  console.log('✓ Progress migration complete')
}

async function verifyMigration() {
  const flashcardsCount = (await db.collection('flashcards').count().get()).data().count
  const progressCount = (await db.collection('progress').count().get()).data().count
  console.log(`Verification -> flashcards: ${flashcardsCount}, progress: ${progressCount}`)
}

async function main() {
  await migrateFlashcards()
  await migrateProgress()
  await verifyMigration()
}

main().catch((err) => {
  console.error('Migration failed', err)
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