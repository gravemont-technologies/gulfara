import { describe, expect, test, vi, beforeEach } from 'vitest';
import { srsEngine, type SRSData, type ReviewResult } from '@/services/srsEngine';

const baseSrsData: SRSData = {
  cardId: 'card-1',
  userId: 'user-1',
  ease: 2.5,
  interval: 1,
  repetitions: 1,
  lastReview: new Date('2024-01-01T00:00:00Z'),
  nextReview: new Date('2024-01-02T00:00:00Z'),
  quality: 4,
};

describe('srsEngine', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-05T00:00:00Z'));
  });

  test('increases interval and repetitions on strong performance', () => {
    const result = srsEngine.calculateNextReview(baseSrsData, 5);

    expect(result.repetitions).toBe(baseSrsData.repetitions + 1);
    expect(result.interval).toBeGreaterThan(baseSrsData.interval);
    expect(result.ease).toBeGreaterThanOrEqual(2.5);
    expect(result.nextReview.getTime()).toBeGreaterThan(Date.now());
  });

  test('resets interval and repetitions on failure', () => {
    const result = srsEngine.calculateNextReview(baseSrsData, 1);

    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.ease).toBeLessThan(baseSrsData.ease);
  });

  test('getDueCards returns only cards with nextReview <= now', () => {
    const cards: SRSData[] = [
      baseSrsData,
      { ...baseSrsData, cardId: 'card-2', nextReview: new Date('2024-01-04T00:00:00Z') },
      { ...baseSrsData, cardId: 'card-3', nextReview: new Date('2024-01-06T00:00:00Z') },
    ];

    const dueCards = srsEngine.getDueCards(cards);
    expect(dueCards.map((card) => card.cardId)).toEqual(['card-1', 'card-2']);
  });

  test('processReview maps review result to quality and updates schedule', () => {
    const review: ReviewResult = {
      cardId: 'card-1',
      quality: 0,
      timeSpent: 8000,
      correct: true,
    };

    const processed = srsEngine.processReview(baseSrsData, review);
    expect(processed.quality).toBeGreaterThanOrEqual(1);
    expect(processed.lastReview.getTime()).toBeLessThanOrEqual(Date.now());
  });
});


