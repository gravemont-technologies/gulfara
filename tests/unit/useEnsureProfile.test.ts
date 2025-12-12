import { describe, expect, it } from 'vitest';
import { __testables } from '@/hooks/useEnsureProfile';

const { normalizeProfile } = __testables;

describe('useEnsureProfile normalizeProfile', () => {
  it('fills missing numeric properties with defaults', () => {
    const normalized = normalizeProfile({
      id: 'uuid',
      clerk_user_id: 'clerk_123',
      name: 'Learner',
      email: 'learner@example.com',
      avatar_url: null,
      gender: null,
      age_range: null,
      occupation: null,
      learning_goals: null,
      difficulty_level: null,
      preferred_categories: null,
      total_points: undefined,
      level: undefined,
      streak: undefined,
      total_study_time: undefined,
      average_accuracy: undefined,
      coins: undefined,
      onboarding_completed: undefined,
      onboarding_data: null,
      preferences: null,
    });

    expect(normalized.coins).toBe(1000);
    expect(normalized.total_points).toBe(0);
    expect(normalized.level).toBe(1);
    expect(normalized.streak).toBe(0);
    expect(normalized.total_study_time).toBe(0);
    expect(normalized.average_accuracy).toBe(0);
    expect(normalized.learning_goals).toEqual([]);
    expect(normalized.preferred_categories).toEqual([]);
    expect(normalized.onboarding_completed).toBe(false);
  });

  it('retains provided values', () => {
    const normalized = normalizeProfile({
      id: 'uuid',
      clerk_user_id: 'clerk_123',
      name: 'Learner',
      email: 'learner@example.com',
      avatar_url: null,
      gender: 'female',
      age_range: '26-35',
      occupation: 'Engineer',
      learning_goals: ['work'],
      difficulty_level: 'B1',
      preferred_categories: ['work'],
      total_points: 250,
      level: 4,
      streak: 5,
      total_study_time: 120,
      average_accuracy: 86.5,
      coins: 900,
      onboarding_completed: true,
      onboarding_data: { difficultyLevel: 'B1' },
      preferences: { categories: ['work'] },
    });

    expect(normalized.learning_goals).toEqual(['work']);
    expect(normalized.difficulty_level).toBe('B1');
    expect(normalized.coins).toBe(900);
    expect(normalized.onboarding_completed).toBe(true);
    expect(normalized.preferences).toEqual({ categories: ['work'] });
  });
});

