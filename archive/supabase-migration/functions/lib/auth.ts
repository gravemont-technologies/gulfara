const CLERK_JWKS_URL = Deno.env.get('CLERK_JWKS_URL');

export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) return null;

  const fallbackUserId = request.headers.get('x-gulfara-user-id');
  if (fallbackUserId) {
    return fallbackUserId;
  }

  if (!CLERK_JWKS_URL) {
    return null;
  }

  const decoded = parseTokenPayload(token);
  if (decoded?.sub) {
    return decoded.sub;
  }

  // TODO: validate `token` via Clerk JWKS (Deno.JS fetch) and enforce signatures.
  return null;
}

function extractBearerToken(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}

function parseTokenPayload(token: string): { sub?: string } | null {
  const [, payload] = token.split('.');
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '='));
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to parse auth payload', error);
    return null;
  }
}
