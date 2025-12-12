import type { SupabaseClient } from '@supabase/supabase-js';
import { deckPrefetcher, type PrefetchedDeck } from './deckPrefetcher';
import type { ProfileRecord } from '@/hooks/useEnsureProfile';

const DECK_TTL_HOURS = 24;

export type UserDeckRow = {
  id: string;
  user_id: string;
  seed_id: string | null;
  deck: PrefetchedDeck;
  categories: string[];
  difficulty_level: string | null;
  generated_at: string;
};

export interface EnsureDeckResult {
  deck: PrefetchedDeck;
  record: UserDeckRow;
  source: 'existing' | 'generated';
}

export const getPreferredCategories = (profile: ProfileRecord): string[] => {
  const fromPreferences = Array.isArray(profile.preferences?.categories)
    ? (profile.preferences?.categories as string[])
    : [];
  const fromProfile = Array.isArray(profile.preferred_categories)
    ? profile.preferred_categories
    : [];

  const categories = [...fromPreferences, ...fromProfile];

  if (categories.length === 0) {
    return ['family', 'work'];
  }

  return Array.from(new Set(categories));
};

export const getPreferredDifficulty = (profile: ProfileRecord): string => {
  const fromPreferences = typeof profile.preferences?.difficultyLevel === 'string'
    ? (profile.preferences?.difficultyLevel as string)
    : null;

  const difficulty = fromPreferences ?? profile.difficulty_level ?? 'A1';
  const allowed = ['A1', 'A2', 'B1', 'B2', 'C1'];

  return allowed.includes(difficulty) ? difficulty : 'A1';
};

export const getLearningGoals = (profile: ProfileRecord): string[] => {
  const fromPreferences = Array.isArray(profile.preferences?.learningGoal)
    ? (profile.preferences?.learningGoal as string[])
    : [];

  const fromProfile = Array.isArray(profile.learning_goals)
    ? profile.learning_goals
    : [];

  return Array.from(new Set([...fromPreferences, ...fromProfile]));
};

export const fetchLatestDeckRecord = async (
  supabase: SupabaseClient,
  userId: string
): Promise<UserDeckRow | null> => {
  const { data, error } = await supabase
    .from('user_decks')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const noRows =
      error.code === 'PGRST116' ||
      error.code === 'PGRST106' ||
      error.message?.toLowerCase().includes('no rows');
    if (!noRows) {
      throw error;
    }
    return null;
  }

  return data as UserDeckRow | null;
};

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
};

const shouldRegenerateDeck = (
  record: UserDeckRow | null,
  categories: string[],
  difficultyLevel: string
) => {
  if (!record) return true;

  if (!arraysEqual(record.categories ?? [], categories)) {
    return true;
  }

  if ((record.difficulty_level ?? difficultyLevel) !== difficultyLevel) {
    return true;
  }

  if (record.generated_at) {
    const generatedAt = new Date(record.generated_at);
    const ttlMillis = DECK_TTL_HOURS * 60 * 60 * 1000;
    if (Date.now() - generatedAt.getTime() > ttlMillis) {
      return true;
    }
  }

  return false;
};

export const generateAndStoreDeck = async (
  supabase: SupabaseClient,
  profile: ProfileRecord,
  categories: string[],
  difficultyLevel: string,
  learningGoals: string[]
): Promise<EnsureDeckResult> => {
  if (!deckPrefetcher.hasApiKey()) {
    throw new Error('OpenAI API key missing; cannot prefetch deck.');
  }

  const deck = await deckPrefetcher.generateDeck({
    profile,
    categories,
    difficultyLevel,
    learningGoals,
  });

  const { data: inserted, error: insertError } = await supabase
    .from('user_decks')
    .insert({
      user_id: profile.id,
      seed_id: `profile-${profile.id}-${Date.now()}`,
      deck,
      categories: deck.metadata.categories ?? categories,
      difficulty_level: deck.metadata.difficultyLevel ?? difficultyLevel,
      generated_at: deck.metadata.generatedAt ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    deck,
    record: inserted as UserDeckRow,
    source: 'generated',
  };
};

export const ensureDeckForProfile = async (
  supabase: SupabaseClient,
  profile: ProfileRecord,
  opts?: {
    categories?: string[];
    difficultyLevel?: string;
    learningGoals?: string[];
    force?: boolean;
  }
): Promise<EnsureDeckResult> => {
  const categories = opts?.categories ?? getPreferredCategories(profile);
  const difficultyLevel = opts?.difficultyLevel ?? getPreferredDifficulty(profile);
  const learningGoals = opts?.learningGoals ?? getLearningGoals(profile);

  const existingRecord = await fetchLatestDeckRecord(supabase, profile.id);

  if (!opts?.force && !shouldRegenerateDeck(existingRecord, categories, difficultyLevel) && existingRecord) {
    return {
      deck: existingRecord.deck,
      record: existingRecord,
      source: 'existing',
    };
  }

  return generateAndStoreDeck(supabase, profile, categories, difficultyLevel, learningGoals);
};


