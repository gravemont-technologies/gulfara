import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@/supabase/client';
import { useUser } from '@clerk/clerk-react';

export interface ProfileRecord {
  id: string;
  clerk_user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  gender: string | null;
  age_range: string | null;
  occupation: string | null;
  learning_goals: string[] | null;
  difficulty_level: string | null;
  preferred_categories: string[] | null;
  total_points: number;
  level: number;
  streak: number;
  total_study_time: number;
  average_accuracy: number;
  coins: number;
  onboarding_completed: boolean;
  onboarding_data: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

const DEFAULT_PROFILE_VALUES: Partial<ProfileRecord> = {
  total_points: 0,
  level: 1,
  streak: 0,
  total_study_time: 0,
  average_accuracy: 0,
  coins: 1000,
  onboarding_completed: false,
  onboarding_data: null,
  preferences: null,
};

const normalizeProfile = (raw: Partial<ProfileRecord>): ProfileRecord => ({
  ...DEFAULT_PROFILE_VALUES,
  ...raw,
  coins: raw.coins ?? DEFAULT_PROFILE_VALUES.coins ?? 1000,
  total_points: raw.total_points ?? DEFAULT_PROFILE_VALUES.total_points ?? 0,
  level: raw.level ?? DEFAULT_PROFILE_VALUES.level ?? 1,
  streak: raw.streak ?? DEFAULT_PROFILE_VALUES.streak ?? 0,
  total_study_time: raw.total_study_time ?? DEFAULT_PROFILE_VALUES.total_study_time ?? 0,
  average_accuracy: raw.average_accuracy ?? DEFAULT_PROFILE_VALUES.average_accuracy ?? 0,
  onboarding_completed: raw.onboarding_completed ?? DEFAULT_PROFILE_VALUES.onboarding_completed ?? false,
  onboarding_data: (raw.onboarding_data ?? DEFAULT_PROFILE_VALUES.onboarding_data) as Record<string, unknown> | null,
  preferences: (raw.preferences ?? DEFAULT_PROFILE_VALUES.preferences) as Record<string, unknown> | null,
  learning_goals: (raw.learning_goals ?? []) as string[],
  preferred_categories: (raw.preferred_categories ?? []) as string[],
} as ProfileRecord);

export const useEnsureProfile = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const supabase = useSupabaseClient();

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<Error | null>(null);

  const emailAddress = useMemo(() => {
    if (!user) return null;
    return (
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress ??
      null
    );
  }, [user]);

  const displayName = useMemo(() => {
    if (!user) return 'Gulfara Learner';
    const fallback = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return (user.fullName ?? fallback) || 'Gulfara Learner';
  }, [user]);

  const ensureProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) return;
    setStatus('loading');
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', user.id)
        .single();

      if (fetchError) {
        const noRows =
          fetchError.code === 'PGRST116' ||
          fetchError.code === 'PGRST106' ||
          fetchError.message?.toLowerCase().includes('no rows');

        if (!noRows) {
          throw fetchError;
        }
      }

      if (!data) {
        const insertPayload = {
          clerk_user_id: user.id,
          name: displayName,
          email: emailAddress ?? 'unknown@gulfara.app',
          avatar_url: user.imageUrl ?? null,
          ...DEFAULT_PROFILE_VALUES,
        };

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert([insertPayload])
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setProfile(normalizeProfile(inserted as Partial<ProfileRecord>));
      } else {
        setProfile(normalizeProfile(data as Partial<ProfileRecord>));
      }

      setStatus('ready');
    } catch (err) {
      setError(err as Error);
      setStatus('error');
    }
  }, [displayName, emailAddress, isLoaded, isSignedIn, supabase, user]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    void ensureProfile();
  }, [ensureProfile, isLoaded, isSignedIn, user]);

  return {
    profile,
    status,
    error,
    refreshProfile: ensureProfile,
    setProfile,
  };
};

export const __testables = {
  normalizeProfile,
};

