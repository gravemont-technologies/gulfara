import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import Onboarding from '@/pages/Onboarding';
import type { ProfileRecord } from '@/hooks/useEnsureProfile';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const setProfileMock = vi.fn();

const updatedProfile = {
  onboarding_completed: true,
  learning_goals: ['work'],
  preferred_categories: ['work'],
};

const singleMock = vi.fn().mockResolvedValue({
  data: {
    id: 'uuid',
    clerk_user_id: 'clerk_123',
    name: 'Test Learner',
    email: 'learner@example.com',
    avatar_url: null,
    gender: 'male',
    age_range: '26-35',
    occupation: 'Engineer',
    learning_goals: ['work'],
    difficulty_level: 'A2',
    preferred_categories: ['work'],
    total_points: 0,
    level: 1,
    streak: 0,
    total_study_time: 0,
    average_accuracy: 0,
    coins: 1000,
    onboarding_completed: true,
    onboarding_data: {
      name: 'Test Learner',
      gender: 'male',
      ageRange: '26-35',
      occupation: 'Engineer',
      learningGoal: ['work'],
      difficultyLevel: 'A2',
      categories: ['work'],
    },
    preferences: {
      categories: ['work'],
      difficultyLevel: 'A2',
      learningGoal: ['work'],
    },
  },
  error: null,
});

const selectMock = vi.fn().mockReturnValue({ single: singleMock });
const eqMock = vi.fn().mockReturnValue({ select: selectMock });
const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
const fromMock = vi.fn().mockReturnValue({ update: updateMock });

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// Mock returns no-op stub (Supabase removed, persistence via Firestore)
vi.mock('@/supabase/client', () => ({
  useSupabaseClient: () => ({
    from: fromMock,
  }),
}));

const profileStub: ProfileRecord = {
  id: 'uuid',
  clerk_user_id: 'clerk_123',
  name: 'Test Learner',
  email: 'learner@example.com',
  avatar_url: null,
  gender: 'male',
  age_range: '26-35',
  occupation: 'Engineer',
  learning_goals: ['work'],
  difficulty_level: 'A2',
  preferred_categories: ['work'],
  total_points: 0,
  level: 1,
  streak: 0,
  total_study_time: 0,
  average_accuracy: 0,
  coins: 1000,
  onboarding_completed: false,
  onboarding_data: {
    name: 'Test Learner',
    gender: 'male',
    ageRange: '26-35',
    occupation: 'Engineer',
    learningGoal: ['work'],
    difficultyLevel: 'A2',
    categories: ['work'],
  },
  preferences: null,
  created_at: '',
  updated_at: '',
};

vi.mock('@/contexts/ProfileContext', () => ({
  useProfile: () => ({
    profile: profileStub,
    setProfile: setProfileMock,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/services/deckManager', () => ({
  ensureDeckForProfile: vi.fn().mockResolvedValue(undefined),
}));

describe('Onboarding profile persistence', () => {
  it('updates profile and navigates to dashboard on completion', async () => {
    const user = userEvent.setup();

    render(<Onboarding />);

    const nextButton = screen.getByRole('button', { name: /Next/i });
    const completeButtonText = /Complete/i;

    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);

    const completeButton = screen.getByRole('button', { name: completeButtonText });
    await user.click(completeButton);

    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Learner',
      onboarding_completed: true,
    }));
    expect(eqMock).toHaveBeenCalledWith('id', profileStub.id);
    expect(singleMock).toHaveBeenCalled();
    expect(setProfileMock).toHaveBeenCalledWith(expect.objectContaining(updatedProfile));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Profile updated',
    }));
    expect(navigateMock).toHaveBeenCalledWith('/app');
  });
});

