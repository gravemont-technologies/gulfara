import { act, render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Practice from '@/pages/Practice';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { ProfileRecord } from '@/hooks/useEnsureProfile';
import type { PrefetchedDeck } from '@/services/deckPrefetcher';

const mockProfile: ProfileRecord = {
  id: 'user-1',
  clerk_user_id: 'clerk-user-1',
  name: 'Test Learner',
  email: 'test@example.com',
  avatar_url: null,
  gender: null,
  age_range: null,
  occupation: null,
  learning_goals: ['work'],
  difficulty_level: 'A1',
  preferred_categories: ['family'],
  total_points: 0,
  level: 1,
  streak: 0,
  total_study_time: 0,
  average_accuracy: 0,
  coins: 1000,
  onboarding_completed: true,
  onboarding_data: null,
  preferences: null,
};

const mockDeck: PrefetchedDeck = {
  cards: [
    {
      id: 'card_1',
      front: 'شلونك؟',
      back: 'How are you?',
      category: 'family',
      difficulty: 2,
      hint: 'Common greeting',
      example: 'شلونك؟ أنا بخير، شكراً',
    },
    {
      id: 'card_2',
      front: 'وين أهلك؟',
      back: 'Where is your family?',
      category: 'family',
      difficulty: 3,
      hint: 'Asking about family location',
      example: 'وين أهلك؟ أهلي في الكويت.',
    },
  ],
  metadata: {
    categories: ['family'],
    difficultyLevel: 'A1',
    generatedAt: new Date().toISOString(),
    source: 'openai',
  },
};

const renderPractice = () =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/app/practice/family']}>
        <Routes>
          <Route
            path="/app/practice/:scenario"
            element={<Practice overrides={{ profile: mockProfile, deck: mockDeck }} />}
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('Practice integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        srsData: {
          cardId: 'card_1',
          userId: 'user-1',
          ease: 2.7,
          interval: 2,
          repetitions: 1,
          lastReview: new Date().toISOString(),
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          quality: 4,
        },
        points: 10,
        mastery: 80,
      }),
    }));
  });

  test('advances to next card and updates streak after answering', async () => {
    renderPractice();

    const submitButton = await screen.findByRole('button', { name: /^Correct$/i });
    await act(async () => {
      submitButton.click();
    });

    await screen.findByText((content) => {
      const normalized = content.replace(/\s+/g, ' ').trim();
      return /Card\s+2\s+of\s+2/i.test(normalized);
    }, { timeout: 2000 });
    expect(screen.getByText(/15 points/i)).toBeInTheDocument();
  });
});


