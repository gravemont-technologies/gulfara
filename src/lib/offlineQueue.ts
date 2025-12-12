import { logger } from '@/lib/logger';
import type { ReviewRequestPayload } from '@/lib/validation';

const STORAGE_KEY = 'gulfara_offline_reviews';

interface QueuedReview {
  reviewId: string;
  payload: ReviewRequestPayload;
  timestamp: string;
}

function readQueue(): QueuedReview[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function writeQueue(queue: QueuedReview[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export const offlineQueue = {
  add(payload: ReviewRequestPayload) {
    const queue = readQueue();
    const reviewId = payload.reviewId ?? crypto.randomUUID();
    const queued: QueuedReview = {
      reviewId,
      payload,
      timestamp: new Date().toISOString()
    };
    queue.push(queued);
    writeQueue(queue);
    logger.info('Queued offline review', { queueLength: queue.length, reviewId });
  },
  getAll() {
    return readQueue();
  },
  remove(reviewId: string) {
    const queue = readQueue().filter((item) => item.reviewId !== reviewId);
    writeQueue(queue);
  },
  clear() {
    writeQueue([]);
  }
};

export async function flushQueuedReviews(): Promise<void> {
  if (typeof window === 'undefined') return;
  const queue = offlineQueue.getAll();
  for (const review of queue) {
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review.payload)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      offlineQueue.remove(review.reviewId);
      logger.info('Flushed offline review', { reviewId: review.reviewId });
    } catch (error) {
      logger.warn('Failed to flush offline review', { reviewId: review.reviewId, message: (error as Error).message });
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    logger.info('Network reconnected, flushing offline reviews');
    flushQueuedReviews();
  });
}
