import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let adminApp: App | undefined

/**
 * Normalize a stored private key value into a PEM string.
 * Accepts either a PEM with escaped `\\n` or an unwrapped base64 body.
 */
export function normalizePrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined
  // If it already contains markers, convert escaped newlines to real ones
  if (raw.includes('BEGIN PRIVATE KEY')) return raw.replace(/\\n/g, '\n').replace(/\n/g, '\n')

  // Otherwise treat as base64 body (possibly containing escaped newlines) and wrap with PEM markers
  const body = raw.replace(/\\n/g, '').replace(/\s+/g, '')
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function getAdminApp(): App {
  if (adminApp) return adminApp
  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  const projectId = requireEnv('FIREBASE_ADMIN_PROJECT_ID', process.env.FIREBASE_ADMIN_PROJECT_ID)
  const clientEmail = requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL', process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
  const privateKeyRaw = requireEnv('FIREBASE_ADMIN_PRIVATE_KEY', process.env.FIREBASE_ADMIN_PRIVATE_KEY)
  const privateKey = requireEnv('FIREBASE_ADMIN_PRIVATE_KEY', normalizePrivateKey(privateKeyRaw))

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })

  return adminApp
}

export const adminAuth = () => getAuth(getAdminApp())
export const adminDb = () => getFirestore(getAdminApp())
