import { describe, it, expect } from 'vitest'
import { normalizePrivateKey } from '../lib/firebase/admin'

describe('normalizePrivateKey', () => {
  it('converts escaped PEM to real PEM', () => {
    const raw = '-----BEGIN PRIVATE KEY-----\\nMIIBFAKEBODY\\n-----END PRIVATE KEY-----\\n'
    const normalized = normalizePrivateKey(raw)!
    expect(normalized).toContain('BEGIN PRIVATE KEY')
    expect(normalized).toContain('\nMIIBFAKEBODY\n')
  })

  it('wraps base64 body with PEM markers', () => {
    const body = 'MIIBFAKEBODY'
    const normalized = normalizePrivateKey(body)!
    expect(normalized.startsWith('-----BEGIN PRIVATE KEY-----')).toBe(true)
    expect(normalized.endsWith('-----END PRIVATE KEY-----\n')).toBe(true)
    expect(normalized).toContain(body)
  })
})
