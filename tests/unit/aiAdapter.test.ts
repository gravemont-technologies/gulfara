import { beforeEach, describe, expect, test, vi } from 'vitest';
import { aiAdapter } from '@/services/aiAdapter';
import { costOptimizer } from '@/services/costOptimizer';

const PERFORMANCE = {
  userId: 'user-abc',
  lastResult: true,
  avgScore: 0.72,
  targetDifficulty: 3,
  recentAnswers: Array.from({ length: 6 }, (_, index) => ({
    correct: index % 2 === 0,
    timeSpent: 12000 + index * 500,
    difficulty: 3,
  })),
};

const CARD = {
  cardId: 'card-123',
  front: 'شلونك؟',
  back: 'How are you?',
  hint: 'Greeting used throughout the Gulf',
  example: 'شلونك؟ أنا بخير، شكراً',
  category: 'Greetings',
  difficulty: 3,
};

describe('aiAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    costOptimizer.resetUserUsage(PERFORMANCE.userId);
  });

  test('falls back to rule-based adjustment when cost limit is exceeded', async () => {
    vi.spyOn(costOptimizer, 'canMakeRequest').mockReturnValue(false);
    const result = await aiAdapter.adjustDifficulty(PERFORMANCE, CARD);
    expect(result.nextDifficulty).toBeLessThanOrEqual(5);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  test('parses AI response and records usage on success', async () => {
    vi.spyOn(costOptimizer, 'canMakeRequest').mockReturnValue(true);
    const recordUsage = vi.spyOn(costOptimizer, 'recordUsage');

    const mockResponse = {
      ok: true,
      json: async () => ({
        result: { nextDifficulty: 4, confidence: 0.8, reasoning: 'test proxy' },
        tokensUsed: 95,
      }),
    };

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await aiAdapter.adjustDifficulty(PERFORMANCE, CARD);

    expect(fetch).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      nextDifficulty: 4,
      confidence: 0.8,
      reasoning: 'test proxy',
    });
    expect(recordUsage).toHaveBeenCalledWith(PERFORMANCE.userId, 95, 'difficultyAdjustment');
  });

  test('returns proxy recommendations when cost limits allow', async () => {
    vi.spyOn(costOptimizer, 'canMakeRequest').mockReturnValue(true);

    const mockResponse = {
      ok: true,
      json: async () => ({
        result: {
          recommendations: ['tip a', 'tip b', 'tip c'],
        },
        tokensUsed: 130,
      }),
    };

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const recommendations = await aiAdapter.generateRecommendations(PERFORMANCE.userId, PERFORMANCE, CARD);
    expect(recommendations).toEqual(['tip a', 'tip b', 'tip c']);
  });

  test('provides default recommendations when cost limit is reached', async () => {
    vi.spyOn(costOptimizer, 'canMakeRequest').mockReturnValue(false);
    const lowScorePerformance = {
      ...PERFORMANCE,
      avgScore: 0.4,
      recentAnswers: PERFORMANCE.recentAnswers.map((answer) => ({
        ...answer,
        timeSpent: 35000,
      })),
    };

    const recommendations = await aiAdapter.generateRecommendations('user-xyz', lowScorePerformance, CARD);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});


