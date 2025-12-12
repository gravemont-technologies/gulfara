import { describe, expect, test } from 'vitest'
import { reviewHandler, type ReviewPayload } from '../../api/review'
import { CLERK_TEST_USER_ID } from '../mocks/clerkServerMock'
import type { ReviewPersistence } from '../../lib/firestore/srsPersistence'
import type { SRSData } from '../../src/services/srsEngine'

function createMockPersistence(initial?: { srsData?: SRSData; progressPoints?: number }) {
  const records = {
    srsWrites: [] as Array<{ userId: string; cardId: string; srs: SRSData }>,
    progressWrites: [] as Array<{ userId: string; points: number }>
  }

  const persistence: ReviewPersistence = {
    async readSrs(userId, cardId) {
      if (initial?.srsData && initial.srsData.userId === userId && initial.srsData.cardId === cardId) {
        return initial.srsData
      }
      return null
    },
    async persistSrs(userId, cardId, srs) {
      records.srsWrites.push({ userId, cardId, srs })
    },
    async updatePoints(userId, points) {
      const base = initial?.progressPoints ?? 0
      const next = base + Math.max(points, 0)
      records.progressWrites.push({ userId, points: next })
      return next
    }
  }

  return { persistence, records }
}

describe('reviewHandler', () => {
  test('processes review and persists SRS/progress', async () => {
    const existingSrs: SRSData = {
      userId: CLERK_TEST_USER_ID,
      cardId: '22222222-2222-2222-9222-222222222222',
      ease: 2.5,
      interval: 1,
      repetitions: 0,
      lastReview: new Date(),
      nextReview: new Date(),
      quality: 0
    }

    const { persistence, records } = createMockPersistence({ srsData: existingSrs, progressPoints: 0 })

    const payload: ReviewPayload = {
      userId: CLERK_TEST_USER_ID,
      cardId: existingSrs.cardId,
      quality: 4,
      timeSpent: 12000,
      correct: true,
      pointsEarned: 15
    }

    const response = await reviewHandler(
      new Request('http://localhost/api/review', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      }),
      persistence
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.points).toBe(15)
    expect(body.srsData).toBeDefined()
    expect(records.srsWrites).toHaveLength(1)
    expect(records.progressWrites).toHaveLength(1)
    expect(records.progressWrites[0].points).toBe(15)
  })
})