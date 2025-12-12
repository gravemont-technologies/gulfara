import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ARCHIVED: Supabase mocks removed. Sync handler now stubbed during migration.
// Tests verify handler structure but skip Supabase-specific assertions.

const syncFunctionMock = vi.fn(async (payload: unknown) => payload);

vi.mock('../../src/services/sync', () => ({
  syncFunction: syncFunctionMock,
}));

async function toNodeResponse(res: Response, nodeRes: ServerResponse<IncomingMessage>) {
  nodeRes.statusCode = res.status;
  res.headers.forEach((value, key) => {
    nodeRes.setHeader(key, value);
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  nodeRes.end(buffer);
}

async function createApp() {
  const { default: handler } = await import('../../api/sync');
  return createServer(async (req, res) => {
    const requestUrl = `http://localhost${req.url ?? ''}`;
    const fetchRequest = new Request(requestUrl, { method: req.method ?? 'GET' });
    const response = await handler(fetchRequest);
    await toNodeResponse(response, res);
  });
}

describe('API /api/sync handler', () => {
  beforeEach(() => {
    vi.resetModules();
    syncFunctionMock.mockReset();
  });

  test('returns stubbed response during migration', async () => {
    const server = await createApp();
    await request(server)
      .get('/api/sync')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
      });
    server.close();
  });

  test('returns 405 for unsupported methods', async () => {
    const server = await createApp();
    await request(server).post('/api/sync').expect(405);
    server.close();
  });
});


