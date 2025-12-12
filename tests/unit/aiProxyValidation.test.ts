import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe('AI proxy validation', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_USER_MONTHLY_CAP = '1000'
    vi.resetModules()
    vi.mock('../../lib/firestore/apiUsagePersistence', () => ({
      apiUsagePersistence: {
        getMonthlyCost: vi.fn().mockResolvedValue(0),
        logUsage: vi.fn().mockResolvedValue(undefined)
      }
    }))
    vi.mock('@clerk/nextjs/server', () => ({
      getAuth: () => ({ userId: 'user-abc' })
    }))
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_USER_MONTHLY_CAP
    vi.resetModules()
  })

  test('returns 400 when OpenAI payload is malformed', async () => {
    const { default: handler } = await import('../../api/ai-proxy')

    const request = new Request('http://localhost/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'adjustDifficulty',
        userId: 'user-abc',
        openAiPayload: {
          model: 'gpt-5-mini'
        }
      })
    })

    const response = await handler(request)

    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error).toMatch(/Invalid OpenAI payload/i)
    expect(payload.details).toBeInstanceOf(Array)
  })
})
