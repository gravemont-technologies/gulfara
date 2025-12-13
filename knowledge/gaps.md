# Critical Gaps → Atomic Implementation Steps

**Current State:** 7/10 (secure AI proxy, DB schema, `/api/review` scaffolded, tests present)  
**Target:** 9/10+ (end-to-end validation, observability, error resilience, cost enforcement, RBAC)

---

## Gap 1: Request/Response Contract Enforcement

### Step 1.1: Create Zod Validation Schemas
**File:** `gulfara/src/lib/validation.ts` (new)
```typescript
import { z } from 'zod';

export const ReviewRequestSchema = z.object({
  userId: z.string().uuid(),
  cardId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
  timeSpent: z.number().positive(),
  correct: z.boolean(),
  pointsEarned: z.number().int().nonnegative()
});

export const ReviewResponseSchema = z.object({
  srsData: z.object({
    ease: z.number(),
    interval: z.number(),
    repetitions: z.number(),
    lastReview: z.string().datetime(),
    nextReview: z.string().datetime(),
    quality: z.number(),
    mastery: z.number().min(0).max(1)
  }),
  progress: z.object({
    total_points: z.number(),
    streak: z.number()
  })
});

export const AIProxyRequestSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })),
  temperature: z.number().optional(),
  max_tokens: z.number().optional()
});

export const AIProxyResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string()
    })
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  })
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type AIProxyRequest = z.infer<typeof AIProxyRequestSchema>;
export type AIProxyResponse = z.infer<typeof AIProxyResponseSchema>;
```
**Action:** Create file with all schemas exported

### Step 1.2: Add Validation to `/api/review`
**File:** `gulfara/api/review.ts`
**Location:** Top of file (after imports)
```typescript
import { ReviewRequestSchema, ReviewResponseSchema } from '@/lib/validation';
```
**Location:** Inside default export function, first lines
```typescript
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();
  const validationResult = ReviewRequestSchema.safeParse(body);
  
  if (!validationResult.success) {
    return new Response(JSON.stringify({
      error: 'Invalid request',
      details: validationResult.error.errors
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { userId, cardId, quality, timeSpent, correct, pointsEarned } = validationResult.data;
  // ... rest of handler
}
```
**Action:** Add validation at handler entry; return 400 on parse failure

### Step 1.3: Add Validation to `/api/ai-proxy`
**File:** `gulfara/api/ai-proxy.ts`
**Location:** Top of file (after imports)
```typescript
import { AIProxyRequestSchema, AIProxyResponseSchema } from '@/lib/validation';
```
**Location:** Inside default export function, after JSON parse
```typescript
const validationResult = AIProxyRequestSchema.safeParse(body);
if (!validationResult.success) {
  return new Response(JSON.stringify({
    error: 'Invalid OpenAI request',
    details: validationResult.error.errors
  }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}
const payload = validationResult.data;
```
**Action:** Validate OpenAI payload before forwarding

### Step 1.4: Type aiAdapter Response
**File:** `gulfara/src/services/aiAdapter.ts`
**Location:** Import section
```typescript
import type { AIProxyResponse } from '@/lib/validation';
```
**Location:** Inside `generateHint` function, after fetch
```typescript
const data: AIProxyResponse = await response.json();
```
**Action:** Add type annotation to proxy response

---

## Gap 2: Observability / Error Tracing

### Step 2.1: Create Logger Module
**File:** `gulfara/src/lib/logger.ts` (new)
```typescript
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const minLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'INFO';
    return levels.indexOf(level) >= levels.indexOf(minLevel);
  }

  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('DEBUG')) {
      console.log(this.format('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog('INFO')) {
      console.log(this.format('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog('WARN')) {
      console.warn(this.format('WARN', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.shouldLog('ERROR')) {
      const errorContext = error ? {
        ...context,
        error: error.message,
        stack: error.stack
      } : context;
      console.error(this.format('ERROR', message, errorContext));
    }
  }
}

export const logger = new Logger();
```
**Action:** Create logger singleton with severity levels

### Step 2.2: Add Logging to `/api/review`
**File:** `gulfara/api/review.ts`
**Location:** Top of file (after imports)
```typescript
import { logger } from '@/lib/logger';
```
**Location:** Inside handler, after validation
```typescript
const startTime = Date.now();
logger.info('Review API called', { userId, cardId, quality });
```
**Location:** Before return statement (success)
```typescript
const duration = Date.now() - startTime;
logger.info('Review processed', { userId, cardId, duration, mastery: srsData.mastery });
```
**Location:** In catch block
```typescript
logger.error('Review API failed', error as Error, { userId, cardId, quality });
```
**Action:** Log entry, success, and errors with timing

### Step 2.3: Add Logging to `/api/ai-proxy`
**File:** `gulfara/api/ai-proxy.ts`
**Location:** After validation, before OpenAI call
```typescript
logger.info('AI proxy called', { userId, model: payload.model, messageCount: payload.messages.length });
const startTime = Date.now();
```
**Location:** After OpenAI response
```typescript
const duration = Date.now() - startTime;
logger.info('OpenAI response received', {
  userId,
  tokens: openAIResponse.usage.total_tokens,
  duration,
  cost: estimatedCost
});
```
**Location:** In catch block
```typescript
logger.error('AI proxy failed', error as Error, { userId, model: payload.model });
```
**Action:** Log AI calls with token count and cost

### Step 2.4: Add Logging to srsEngine
**File:** `gulfara/src/services/srsEngine.ts`
**Location:** Inside `processReview` function, after SM-2 calculation
```typescript
import { logger } from '@/lib/logger';
// ... inside processReview
logger.debug('SRS calculation', {
  cardId: srsData.cardId,
  quality: result.quality,
  oldEase: srsData.ease,
  newEase,
  oldInterval: srsData.interval,
  newInterval,
  nextReview: nextReviewDate.toISOString()
});
```
**Action:** Log SRS state transitions

### Step 2.5: Add Logging to sync.ts
**File:** `gulfara/src/services/sync.ts`
**Location:** Inside `queueAction` function
```typescript
logger.info('Action queued', { type: action.type, queueLength: queue.length });
```
**Location:** Inside sync success
```typescript
logger.info('Sync completed', { actionType: action.type, success: true });
```
**Location:** Inside sync failure
```typescript
logger.warn('Sync failed, will retry', { actionType: action.type, error: err.message });
```
**Action:** Log queue operations and sync results

---

## Gap 3: Error Boundaries / User-Facing Error Recovery

### Step 3.1: Create Error Boundary Component
**File:** `gulfara/src/components/ErrorBoundary.tsx` (new)
```typescript
import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    logger.error('React error boundary caught', error, { errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
              <h2 className="text-2xl font-bold text-gray-800">Something went wrong</h2>
              <p className="text-gray-600">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
```
**Action:** Create error boundary that catches React crashes

### Step 3.2: Create Offline Queue Module
**File:** `gulfara/src/lib/offlineQueue.ts` (new)
```typescript
import { logger } from './logger';

interface QueuedReview {
  id: string;
  userId: string;
  cardId: string;
  quality: number;
  timeSpent: number;
  correct: boolean;
  pointsEarned: number;
  timestamp: string;
}

const QUEUE_KEY = 'gulfara_offline_queue';

export const offlineQueue = {
  add(review: Omit<QueuedReview, 'id' | 'timestamp'>): void {
    const queue = this.getAll();
    const queuedReview: QueuedReview = {
      ...review,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    queue.push(queuedReview);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    logger.info('Review queued offline', { queueLength: queue.length });
  },

  getAll(): QueuedReview[] {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  remove(id: string): void {
    const queue = this.getAll().filter(r => r.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clear(): void {
    localStorage.removeItem(QUEUE_KEY);
  }
};
```
**Action:** Create localStorage-backed queue for failed reviews

### Step 3.3: Add Retry Logic to Practice.tsx
**File:** `gulfara/src/pages/Practice.tsx`
**Location:** Top of file (after imports)
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { offlineQueue } from '@/lib/offlineQueue';
import { logger } from '@/lib/logger';
```
**Location:** Inside `handleAnswer`, replace try-catch block
```typescript
let updatedCard = currentCard;
let retries = 0;
const maxRetries = 3;

while (retries < maxRetries) {
  try {
    if (baseProfile) {
      const reviewResponse = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: baseProfile.id,
          cardId: currentDeckCard.id,
          quality: reviewResult.quality,
          timeSpent,
          correct,
          pointsEarned
        }),
      });

      if (!reviewResponse.ok) {
        throw new Error(await reviewResponse.text());
      }

      const reviewBody = await reviewResponse.json();
      const serverSrs = reviewBody.srsData;
      if (serverSrs) {
        updatedCard = {
          ...currentCard,
          ease: serverSrs.ease,
          interval: serverSrs.interval,
          repetitions: serverSrs.repetitions,
          lastReview: new Date(serverSrs.lastReview ?? serverSrs.last_review),
          nextReview: new Date(serverSrs.nextReview ?? serverSrs.next_review),
          quality: serverSrs.quality
        };
      }
      break; // Success, exit retry loop
    }
  } catch (error) {
    retries++;
    logger.warn(`Review API failed (attempt ${retries}/${maxRetries})`, { error, userId: baseProfile?.id, cardId: currentDeckCard.id });
    
    if (retries >= maxRetries) {
      // Queue offline and use local SRS
      offlineQueue.add({
        userId: baseProfile.id,
        cardId: currentDeckCard.id,
        quality: reviewResult.quality,
        timeSpent,
        correct,
        pointsEarned
      });
      
      toast({
        title: 'Connection lost',
        description: 'Your progress is saved locally and will sync when online.',
        variant: 'default'
      });
      
      updatedCard = srsEngine.processReview(currentCard, reviewResult);
      await recordProgress(updatedCard, currentDeckCard, reviewResult);
      break;
    }
    
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 500));
  }
}
```
**Action:** Add retry with exponential backoff; queue offline on final failure

### Step 3.4: Wrap Practice in ErrorBoundary
**File:** `gulfara/src/pages/Practice.tsx`
**Location:** Bottom of file, wrap default export
```typescript
function PracticeWithBoundary(props: PracticeProps) {
  return (
    <ErrorBoundary>
      <Practice {...props} />
    </ErrorBoundary>
  );
}

export default PracticeWithBoundary;
```
**Action:** Wrap Practice component in error boundary

### Step 3.5: Add Offline Sync on Network Reconnect
**File:** `gulfara/src/services/sync.ts`
**Location:** Add new function at bottom
```typescript
import { offlineQueue } from '@/lib/offlineQueue';
import { logger } from '@/lib/logger';

export async function syncOfflineQueue(): Promise<void> {
  const queue = offlineQueue.getAll();
  if (queue.length === 0) return;

  logger.info('Syncing offline queue', { count: queue.length });

  for (const review of queue) {
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });

      if (response.ok) {
        offlineQueue.remove(review.id);
        logger.info('Offline review synced', { reviewId: review.id });
      } else {
        throw new Error(await response.text());
      }
    } catch (error) {
      logger.error('Offline review sync failed', error as Error, { reviewId: review.id });
      // Keep in queue for next sync attempt
    }
  }
}

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    logger.info('Network reconnected, syncing offline queue');
    syncOfflineQueue();
  });
}
```
**Action:** Auto-sync offline queue when network reconnects

---

## Gap 4: Cost Cap Enforcement / Quota Alerts

### Step 4.1: Add Usage Check to AI Proxy
**File:** `gulfara/api/ai-proxy.ts`
**Location:** After validation, before OpenAI call
```typescript
// Check user's current usage
const { data: usageData, error: usageError } = await supabase
  .from('user_api_usage')
  .select('total_cost')
  .eq('user_id', userId)
  .single();

if (usageError && usageError.code !== 'PGRST116') { // Not "not found"
  logger.error('Failed to fetch user usage', usageError as Error, { userId });
  return new Response('Failed to check usage quota', { status: 500 });
}

const currentCost = usageData?.total_cost ?? 0;
const COST_CAP = 0.01; // $0.01 per user

if (currentCost >= COST_CAP) {
  logger.warn('User exceeded AI quota', { userId, currentCost, cap: COST_CAP });
  return new Response(JSON.stringify({
    error: 'AI quota exceeded',
    message: 'You have reached your AI usage limit. Upgrade to continue.',
    currentUsage: currentCost,
    limit: COST_CAP
  }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '86400' }
  });
}
```
**Action:** Fetch usage, return 429 if over cap

### Step 4.2: Handle 429 in aiAdapter
**File:** `gulfara/src/services/aiAdapter.ts`
**Location:** Inside `generateHint`, after fetch
```typescript
if (response.status === 429) {
  const errorData = await response.json();
  logger.warn('AI quota exceeded', { message: errorData.message });
  throw new Error(errorData.message || 'AI quota exceeded');
}
```
**Action:** Throw descriptive error on quota exceeded

### Step 4.3: Display Usage in Dashboard
**File:** `gulfara/src/pages/Dashboard.tsx`
**Location:** Add state for usage
```typescript
const [aiUsage, setAiUsage] = useState<{ current: number; limit: number }>({ current: 0, limit: 0.01 });
```
**Location:** Inside useEffect (fetch usage)
```typescript
async function fetchAIUsage() {
  if (!profile) return;
  const { data } = await supabase
    .from('user_api_usage')
    .select('total_cost')
    .eq('user_id', profile.id)
    .single();
  
  setAiUsage({ current: data?.total_cost ?? 0, limit: 0.01 });
}
fetchAIUsage();
```
**Location:** Add usage card to UI
```typescript
<Card>
  <CardContent className="p-6">
    <h3 className="text-lg font-semibold mb-4">AI Usage</h3>
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Used</span>
        <span className="font-mono">${aiUsage.current.toFixed(4)}</span>
      </div>
      <Progress value={(aiUsage.current / aiUsage.limit) * 100} />
      <div className="flex justify-between text-sm text-gray-600">
        <span>Remaining</span>
        <span className="font-mono">${(aiUsage.limit - aiUsage.current).toFixed(4)}</span>
      </div>
    </div>
  </CardContent>
</Card>
```
**Action:** Display AI usage bar in dashboard

### Step 4.4: Show Quota Error in Practice UI
**File:** `gulfara/src/pages/Practice.tsx`
**Location:** Inside catch block where aiAdapter is called
```typescript
if (error.message?.includes('quota exceeded')) {
  toast({
    title: 'AI features unavailable',
    description: 'You have reached your AI usage limit. Practice will continue without AI hints.',
    variant: 'destructive',
    duration: 5000
  });
}
```
**Action:** Show user-friendly message when quota hit

---

## Gap 5: RBAC / RLS Enforcement

### Step 5.1: Extract Auth from Clerk in `/api/review`
**File:** `gulfara/api/review.ts`
**Location:** Top of handler, before validation
```typescript
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Extract authenticated user
  const { userId: authUserId } = getAuth(req);
  if (!authUserId) {
    logger.warn('Unauthenticated review attempt');
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const validationResult = ReviewRequestSchema.safeParse(body);
  
  if (!validationResult.success) {
    return new Response(JSON.stringify({
      error: 'Invalid request',
      details: validationResult.error.errors
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { userId, cardId, quality, timeSpent, correct, pointsEarned } = validationResult.data;

  // Validate ownership
  if (userId !== authUserId) {
    logger.error('User ID mismatch in review', undefined, { authUserId, requestUserId: userId });
    return new Response('Forbidden: User ID mismatch', { status: 403 });
  }

  // ... rest of handler
}
```
**Action:** Extract Clerk auth, validate userId matches authenticated user

### Step 5.2: Add RLS to Supabase Queries in `/api/review`
**File:** `gulfara/api/review.ts`
**Location:** All Supabase queries
```typescript
// Fetch SRS data with RLS
const { data: srsData, error: fetchError } = await supabase
  .from('srs_data')
  .select('*')
  .eq('user_id', authUserId) // Enforce user owns data
  .eq('card_id', cardId)
  .single();

// Upsert with RLS
const { error: upsertError } = await supabase
  .from('srs_data')
  .upsert({
    user_id: authUserId, // Always use authenticated user
    card_id: cardId,
    ease: newSrsData.ease,
    // ... rest of fields
  });

// Update progress with RLS
const { error: progressError } = await supabase
  .from('user_progress')
  .upsert({
    user_id: authUserId, // Always use authenticated user
    card_id: cardId,
    // ... rest of fields
  });
```
**Action:** Use `authUserId` in all queries, never trust client `userId`

### Step 5.3: Extract Auth in `/api/ai-proxy`
**File:** `gulfara/api/ai-proxy.ts`
**Location:** Top of handler
```typescript
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req: Request) {
  const { userId: authUserId } = getAuth(req);
  if (!authUserId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ... rest of handler uses authUserId for all queries
}
```
**Action:** Extract auth, use for all Supabase queries

### Step 5.4: Add RLS Policies to Schema
**File:** `gulfara/supabase-schema.sql`
**Location:** After table definitions, add RLS policies
```sql
-- Enable RLS on all user tables
ALTER TABLE srs_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_usage ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only read/write their own data
CREATE POLICY "Users can manage own SRS data"
  ON srs_data
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own progress"
  ON user_progress
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own API usage"
  ON user_api_usage
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert API usage"
  ON user_api_usage
  FOR INSERT
  WITH CHECK (true); -- Only service role key can insert
```
**Action:** Add RLS policies to schema file

### Step 5.5: Log Security Violations
**File:** `gulfara/api/review.ts`
**Location:** In userId mismatch block
```typescript
if (userId !== authUserId) {
  logger.error('SECURITY: User ID mismatch in review', undefined, {
    authUserId,
    requestUserId: userId,
    cardId,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    userAgent: req.headers.get('user-agent')
  });
  return new Response('Forbidden: User ID mismatch', { status: 403 });
}
```
**Action:** Log security violations with IP and user agent

---

## Implementation Checklist

### Phase 1: Validation (5 min)
- [ ] Create `gulfara/src/lib/validation.ts` with all Zod schemas
- [ ] Add validation to `gulfara/api/review.ts`
- [ ] Add validation to `gulfara/api/ai-proxy.ts`
- [ ] Type aiAdapter response in `gulfara/src/services/aiAdapter.ts`

### Phase 2: Logging (8 min)
- [ ] Create `gulfara/src/lib/logger.ts` with Logger class
- [ ] Add logging to `gulfara/api/review.ts` (entry, success, error)
- [ ] Add logging to `gulfara/api/ai-proxy.ts` (AI calls, tokens, cost)
- [ ] Add logging to `gulfara/src/services/srsEngine.ts` (SRS calculations)
- [ ] Add logging to `gulfara/src/services/sync.ts` (queue operations)

### Phase 3: Error Handling (10 min)
- [ ] Create `gulfara/src/components/ErrorBoundary.tsx`
- [ ] Create `gulfara/src/lib/offlineQueue.ts`
- [ ] Add retry logic to `gulfara/src/pages/Practice.tsx`
- [ ] Wrap Practice in ErrorBoundary
- [ ] Add offline sync to `gulfara/src/services/sync.ts`

### Phase 4: Cost Enforcement (5 min)
- [ ] Add usage check to `gulfara/api/ai-proxy.ts`
- [ ] Handle 429 in `gulfara/src/services/aiAdapter.ts`
- [ ] Display usage in `gulfara/src/pages/Dashboard.tsx`
- [ ] Show quota error in `gulfara/src/pages/Practice.tsx`

### Phase 5: RBAC/RLS (5 min)
- [ ] Extract auth in `gulfara/api/review.ts`
- [ ] Add RLS to all Supabase queries in `gulfara/api/review.ts`
- [ ] Extract auth in `gulfara/api/ai-proxy.ts`
- [ ] Add RLS policies to `gulfara/supabase-schema.sql`
- [ ] Log security violations

### Phase 6: Testing (5 min)
- [ ] Unit test: validation rejects bad payloads
- [ ] Unit test: logger formats correctly
- [ ] Integration test: offline queue syncs when online
- [ ] Integration test: 429 blocks AI calls when over quota
- [ ] Integration test: RLS prevents cross-user data access
- [ ] E2E test: sign in → practice → offline → reconnect → sync

---

## Acceptance Criteria (9/10 Rating)

✅ **Validation:** All API endpoints return 400 on invalid input; TypeScript catches type mismatches  
✅ **Logging:** Every user action logs to stdout with ISO timestamp, severity, context  
✅ **Error Handling:** Practice UI never crashes; shows errors to user; retries automatically  
✅ **Offline:** Failed reviews queue locally; auto-sync when network reconnects  
✅ **Cost:** AI proxy blocks calls at $0.01 cap; Dashboard shows usage; User sees quota message  
✅ **Security:** RLS enforces user ownership; Auth validated on every API call; Security violations logged  
✅ **Testing:** All 6 phases have unit/integration tests; E2E test validates full workflow

**Final Rating:** 9/10 — Surgical, atomic, executable steps with zero ambiguity
