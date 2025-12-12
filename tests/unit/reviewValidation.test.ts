import { describe, expect, test } from 'vitest';
import { reviewHandler } from '../../api/review';

function createBadRequest(body: unknown) {
  return new Request('http://localhost/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

describe('reviewHandler validation', () => {
  test('rejects non-JSON payloads', async () => {
    const response = await reviewHandler(createBadRequest('not-json'), {} as any);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe('Invalid JSON body');
  });

  test('rejects invalid schema', async () => {
    const response = await reviewHandler(createBadRequest({ userId: 'not-uuid', cardId: 'card', quality: 6 }), {} as any);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe('Invalid request payload');
    expect(payload.details).toBeInstanceOf(Array);
  });
});
