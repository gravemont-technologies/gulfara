import { describe, it, expect } from 'vitest'

describe('Clerk JWKS verifier', () => {
  it('throws when CLERK_JWKS_URL is not configured', async () => {
    // Ensure env var is unset for this test
    delete process.env.CLERK_JWKS_URL
    const clerk = await import('../../lib/auth/clerk')
    await expect(clerk.verifyToken('Bearer abc')).rejects.toThrow(/CLERK_JWKS_URL is not configured/)
  })

  it('rejects malformed Authorization header', async () => {
    // Provide a dummy JWKS URL so the module can initialize
    process.env.CLERK_JWKS_URL = 'https://example.com/.well-known/jwks.json'
    const clerk = await import('../../lib/auth/clerk')
    await expect(clerk.verifyToken('not-a-bearer')).rejects.toThrow(/Malformed Authorization header/)
  })
})
