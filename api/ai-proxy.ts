import { getAuth } from '@clerk/nextjs/server'
import { verifyToken } from '../lib/auth/clerk'
import { logger } from '../src/lib/logger'
import { adminDb } from '../lib/firebase/admin'
import { AIProxyRequestSchema } from '../src/lib/validation'
import { apiUsagePersistence } from '../lib/firestore/apiUsagePersistence'

interface ProxyRequest {
  action: 'adjustDifficulty' | 'generateRecommendations'
  userId?: string
  openAiPayload: Record<string, unknown>
  requestMeta?: {
    model?: string
    estimatedTokens?: number
    requestType?: 'difficulty' | 'recommendations'
  }
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MONTHLY_CAP = Number(process.env.OPENAI_USER_MONTHLY_CAP ?? '0')
const MONTHLY_CAP = Number.isFinite(OPENAI_MONTHLY_CAP) && OPENAI_MONTHLY_CAP > 0 ? OPENAI_MONTHLY_CAP : Number.POSITIVE_INFINITY

const COST_PER_1K: Record<string, number> = {
  'gpt-5-mini': 0.002,
  'gpt-5-nano': 0.0005,
}

function calculateCost(tokens: number, model?: string): number {
  const perToken = COST_PER_1K[model ?? 'gpt-5-nano'] ?? COST_PER_1K['gpt-5-nano']
  return (tokens / 1000) * perToken
}

function extractResult(data: any) {
  const outputContent =
    data.output?.[0]?.content ??
    data.choices?.[0]?.message?.content ??
    []
  const jsonContent =
    outputContent.find((item: any) => item?.type === 'json' || item?.type === 'output_json' || item?.type === 'json_schema')?.json ??
    (() => {
      try {
        const fallbackText = outputContent.find((item: any) => item?.text)?.text;
        return fallbackText ? JSON.parse(fallbackText) : null;
      } catch {
        return null;
      }
    })();

  return jsonContent ?? data;
}

export default async function handler(req: Request) {
  // If an Authorization header is present, verify it via JWKS. Otherwise
  // rely on `getAuth` (mocked in tests) to provide auth details.
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    try {
      await verifyToken(authHeader)
    } catch (err) {
      logger.warn('Unauthorized AI proxy request - token verification failed', { message: (err as Error).message })
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { userId: authUserId } = getAuth(req);
  if (!authUserId) {
    logger.warn('AI proxy unauthenticated request');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const headerUserId = req.headers.get('x-gulfara-user-id') ?? undefined;
  if (headerUserId && headerUserId !== authUserId) {
    logger.warn('AI proxy header user mismatch', { headerUserId, authUserId });
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'OpenAI API key missing on server.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  let body: ProxyRequest;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { openAiPayload, userId: requestUserId, requestMeta } = body;
  if (!openAiPayload) {
    return new Response(JSON.stringify({ error: 'Missing openAiPayload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const validatedRequest = AIProxyRequestSchema.safeParse(openAiPayload);
  if (!validatedRequest.success) {
    return new Response(JSON.stringify({ error: 'Invalid OpenAI payload', details: validatedRequest.error.issues }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const normalizedPayload = validatedRequest.data;

  try {
    const start = Date.now();
    if (requestUserId && requestUserId !== authUserId) {
      logger.warn('AI proxy payload user mismatch', { authUserId, requestUserId });
    }
    logger.info('AI proxy request', { authUserId, requestUserId, action: body.action, model: normalizedPayload.model });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(normalizedPayload),
    });

    const data = await openaiResponse.json();
    const tokensUsed =
      data.usage?.total_tokens ??
      data.usage?.output_tokens ??
      requestMeta?.estimatedTokens ??
      0;
    const model = openAiPayload?.model ?? requestMeta?.model ?? 'gpt-5-nano';
    const cost = calculateCost(tokensUsed, model);
    const normalizedResult = extractResult(data);

    // usage logging handled via Firestore persistence helper

    logger.info('AI proxy response', {
      userId: authUserId,
      tokens: tokensUsed,
      cost,
      duration: Date.now() - start
    });

    return new Response(JSON.stringify({
      result: normalizedResult,
      tokensUsed,
      cost,
    }), {
      status: openaiResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('AI proxy error', { userId: authUserId, action: body.action, message: (error as Error).message });
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
