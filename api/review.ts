import { getAuth } from '@clerk/nextjs/server'
import { verifyToken } from '../lib/auth/clerk'
import { adminDb } from '../lib/firebase/admin'
import { ReviewRequestSchema } from '../src/lib/validation'
import { srsEngine, type SRSData } from '../src/services/srsEngine'
import { logger } from '../src/lib/logger'
import { firestorePersistence, type ReviewPersistence } from '../lib/firestore/srsPersistence'

export interface ReviewPayload {
  userId: string
  cardId: string
  quality: number
  timeSpent: number
  correct: boolean
  pointsEarned: number
  reviewId?: string
}

interface ReviewResponse {
  srsData: SRSData
  points: number
  mastery: number
}

const jsonHeaders = { 'Content-Type': 'application/json' }

function buildDefaultSrs(userId: string, cardId: string): SRSData {
  const now = new Date()
  return {
    cardId,
    userId,
    ease: 2.5,
    interval: 1,
    repetitions: 0,
    lastReview: now,
    nextReview: now,
    quality: 0
  }
}

export async function reviewHandler(request: Request, persistenceOverride?: ReviewPersistence) {
  // If an Authorization header is present, verify it via JWKS. Otherwise
  // rely on `getAuth` (which is mocked in tests) to supply auth context.
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    try {
      await verifyToken(authHeader)
    } catch (err) {
      logger.warn('Unauthorized review attempt - token verification failed', { message: (err as Error).message })
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders })
    }
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const { userId: authUserId } = getAuth(request)
  if (!authUserId) {
    logger.warn('Unauthenticated review attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  const headerUserId = request.headers.get('x-gulfara-user-id') ?? undefined
  if (headerUserId && headerUserId !== authUserId) {
    logger.warn('Review header user mismatch', { headerUserId, authUserId })
  }

  let parsedBody: ReviewPayload
  try {
    const rawBody = await request.json()
    const parsed = ReviewRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid request payload', details: parsed.error.issues }), {
        status: 400,
        headers: jsonHeaders
      })
    }
    parsedBody = parsed.data
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: jsonHeaders })
  }

  if (parsedBody.userId !== authUserId) {
    logger.error('User ID mismatch in review', { authUserId, headerUserId: parsedBody.userId, cardId: parsedBody.cardId, reviewId: parsedBody.reviewId })
    return new Response(JSON.stringify({ error: 'Forbidden: user mismatch' }), { status: 403, headers: jsonHeaders })
  }

  const persistence = persistenceOverride ?? firestorePersistence
  // Determine request id for idempotency (client may provide `x-gulfara-request-id` or standard `x-request-id`)
  const requestId = request.headers.get('x-gulfara-request-id') ?? request.headers.get('x-request-id') ?? undefined
  const start = Date.now()

  try {
    logger.info('Review request received', {
      authUserId,
      cardId: parsedBody.cardId,
      reviewId: parsedBody.reviewId
    })

    const existing = await persistence.readSrs(authUserId, parsedBody.cardId)
    const startingSrs = existing ?? buildDefaultSrs(authUserId, parsedBody.cardId)

    const updatedSrs = srsEngine.processReview(startingSrs as SRSData, {
      cardId: parsedBody.cardId,
      quality: parsedBody.quality,
      timeSpent: parsedBody.timeSpent,
      correct: parsedBody.correct
    })

    // Persist SRS and points. Support both the new `persistReview` (atomic/idempotent)
    // and the legacy `persistSrs`/`updatePoints` pair for test mocks.
    let totalPoints: number
    if (typeof (persistence as any).persistReview === 'function') {
      totalPoints = await (persistence as any).persistReview(authUserId, parsedBody.cardId, updatedSrs, parsedBody.pointsEarned ?? 0, requestId)
    } else {
      await (persistence as any).persistSrs?.(authUserId, parsedBody.cardId, updatedSrs)
      totalPoints = await (persistence as any).updatePoints?.(authUserId, parsedBody.pointsEarned ?? 0)
    }

    const responseBody: ReviewResponse = {
      srsData: updatedSrs,
      points: totalPoints,
      mastery: srsEngine.calculateMastery(updatedSrs)
    }

    logger.info('Review processed', {
      authUserId,
      cardId: parsedBody.cardId,
      reviewId: parsedBody.reviewId,
      duration: Date.now() - start,
      points: totalPoints,
      mastery: responseBody.mastery
    })

    return new Response(JSON.stringify(responseBody), { status: 200, headers: jsonHeaders })
  } catch (error) {
    logger.error('Review handler failed', {
      authUserId,
      cardId: parsedBody.cardId,
      reviewId: parsedBody.reviewId,
      message: (error as Error).message
    })
    return new Response(JSON.stringify({ error: 'Review processing failed' }), { status: 500, headers: jsonHeaders })
  }
}

export default async function handler(request: Request) {
  return reviewHandler(request)
}