import { jwtVerify, createRemoteJWKSet, JWTVerifyResult } from 'jose'

const JWKS_URL = process.env.CLERK_JWKS_URL

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

function getJwks() {
  if (!JWKS_URL) throw new Error('CLERK_JWKS_URL is not configured in environment')
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL))
  return jwks
}

export async function verifyToken(authorizationHeader: string) {
  if (!authorizationHeader) throw new Error('Missing Authorization header')
  const parts = authorizationHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') throw new Error('Malformed Authorization header')
  const token = parts[1]

  try {
    const key = getJwks()
    const verified = await jwtVerify(token, key)
    return verified.payload
  } catch (err) {
    throw new Error(`Token verification failed: ${(err as Error).message}`)
  }
}

export type ClerkClaims = Record<string, any>

export default { verifyToken }
