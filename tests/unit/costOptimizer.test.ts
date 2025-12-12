import { beforeEach, describe, expect, test } from 'vitest';
import { costOptimizer } from '@/services/costOptimizer';

const USER_ID = 'user-123';

describe('costOptimizer', () => {
  beforeEach(() => {
    costOptimizer.resetUserUsage(USER_ID);
  });

  test('allows requests until max token threshold is reached', () => {
    expect(costOptimizer.canMakeRequest(USER_ID, 200)).toBe(true);
    costOptimizer.recordUsage(USER_ID, 200, 'difficultyAdjustment');
    expect(costOptimizer.canMakeRequest(USER_ID, 250)).toBe(true);
    costOptimizer.recordUsage(USER_ID, 250, 'recommendations');
    expect(costOptimizer.canMakeRequest(USER_ID, 100)).toBe(false);
  });

  test('calculates blended cost across models', () => {
    costOptimizer.recordUsage(USER_ID, 200, 'difficultyAdjustment');
    costOptimizer.recordUsage(USER_ID, 100, 'recommendations');
    const totalCost = costOptimizer.getUserCost(USER_ID);
    expect(totalCost).toBeCloseTo(
      costOptimizer.calculateCost(200, 'gpt-5-nano') +
        costOptimizer.calculateCost(100, 'gpt-5-mini'),
      5
    );
  });

  test('selects appropriate model based on remaining tokens', () => {
    expect(costOptimizer.getOptimalModel(USER_ID, 'difficulty')).toBe('gpt-5-nano');
    expect(costOptimizer.getOptimalModel(USER_ID, 'recommendations')).toBe('gpt-5-mini');

    costOptimizer.recordUsage(USER_ID, 450, 'difficultyAdjustment');
    expect(costOptimizer.getOptimalModel(USER_ID, 'recommendations')).toBe('gpt-5-nano');
  });

  test('provides usage stats with remaining tokens', () => {
    costOptimizer.recordUsage(USER_ID, 300, 'difficultyAdjustment');
    const stats = costOptimizer.getUsageStats(USER_ID);
    expect(stats.totalTokens).toBe(300);
    expect(stats.remainingTokens).toBeGreaterThan(0);
    expect(typeof stats.totalCost).toBe('number');
    expect(typeof stats.canMakeRequest).toBe('boolean');
  });
});


