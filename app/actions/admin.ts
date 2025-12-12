 'use server'

 import { adminAuth, adminDb } from '../../lib/firebase/admin'

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
