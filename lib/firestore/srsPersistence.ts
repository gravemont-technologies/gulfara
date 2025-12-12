import { adminDb } from '../firebase/admin'
import type { SRSData } from '../src/services/srsEngine'

const srsCollection = () => adminDb().collection('srsData')
const progressCollection = () => adminDb().collection('userProgress')

export interface ReviewPersistence {
  readSrs(userId: string, cardId: string): Promise<SRSData | null>
  // Atomically persist SRS update and points (idempotent when requestId provided)
  persistReview(userId: string, cardId: string, srs: SRSData, points: number, requestId?: string): Promise<number>
}

const toSrsData = (payload: Record<string, unknown> | undefined, userId: string, cardId: string): SRSData => {
  const ease = Number(payload?.ease ?? 2.5)
  const interval = Number(payload?.interval ?? 1)
  const repetitions = Number(payload?.repetitions ?? 0)
  const quality = Number(payload?.quality ?? 0)
  const lastReview = new Date(String(payload?.lastReview ?? payload?.last_review ?? new Date().toISOString()))
  const nextReview = new Date(String(payload?.nextReview ?? payload?.next_review ?? new Date().toISOString()))

  return {
    cardId: String(payload?.cardId ?? payload?.card_id ?? cardId),
    userId: String(payload?.userId ?? payload?.user_id ?? userId),
    ease,
    interval,
    repetitions,
    lastReview,
    nextReview,
    quality
  }
}

const srsPayload = (userId: string, cardId: string, srs: SRSData) => ({
  userId,
  cardId,
  ease: srs.ease,
  interval: srs.interval,
  repetitions: srs.repetitions,
  lastReview: srs.lastReview.toISOString(),
  nextReview: srs.nextReview.toISOString(),
  quality: srs.quality,
  updatedAt: new Date().toISOString()
})

export const firestorePersistence: ReviewPersistence = {
  async readSrs(userId, cardId) {
    const doc = await srsCollection().doc(`${userId}_${cardId}`).get()
    if (!doc.exists) return null
    return toSrsData(doc.data() as Record<string, unknown>, userId, cardId)
  },

  // persistReview performs an atomic, idempotent write of the SRS and points.
  // If `requestId` is provided and a record exists, the transaction will be a no-op
  // and the previously stored points total will be returned.
  async persistReview(userId, cardId, srs, points, requestId) {
    const idempotencyRef = (rid: string) => adminDb().collection('idempotency').doc(`${userId}_${rid}`)
    const srsRef = srsCollection().doc(`${userId}_${cardId}`)
    const pointsRef = progressCollection().doc(userId)

    const result = await adminDb().runTransaction(async (tx) => {
      if (requestId) {
        const idemSnap = await tx.get(idempotencyRef(requestId))
        if (idemSnap.exists) {
          // Already processed: return previously recorded points total
          const recorded = idemSnap.data()?.resultingPoints
          return Number(recorded ?? 0)
        }
      }

      // Read current points before performing writes (Firestore transaction requirement)
      const pointsSnap = await tx.get(pointsRef)
      const previous = Number(pointsSnap.data()?.points ?? 0)
      const next = previous + Math.max(points ?? 0, 0)

      // Write/merge SRS payload after reads
      tx.set(srsRef, srsPayload(userId, cardId, srs), { merge: true })
      tx.set(pointsRef, { points: next, updatedAt: new Date().toISOString() }, { merge: true })

      // Record idempotency if requestId provided
      if (requestId) {
        tx.set(idempotencyRef(requestId), { createdAt: new Date().toISOString(), cardId, points, resultingPoints: next })
      }

      return next
    })

    return result
  }
}
