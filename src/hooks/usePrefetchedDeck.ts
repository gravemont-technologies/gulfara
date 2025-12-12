import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useSupabaseClient } from '@/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ensureDeckForProfile,
  getPreferredCategories,
  getPreferredDifficulty,
  getLearningGoals,
  type UserDeckRow,
} from '@/services/deckManager';
import type { PrefetchedDeck } from '@/services/deckPrefetcher';
import flashcardData from '@/content/flashcards.json';

type DeckSource = 'prefetched' | 'fallback';

const TARGET_CARD_COUNT = 12;

const buildFallbackDeck = (categories: string[], difficultyLevel: string): PrefetchedDeck => {
  const availableCategories = categories.length > 0
    ? categories
    : flashcardData.categories.map(category => category.id);

  const cards = flashcardData.flashcards
    .filter(card => availableCategories.includes(card.category))
    .sort((a, b) => {
      const diffA = Math.abs((a.difficulty ?? 3) - parseInt(difficultyLevel.replace(/\D/g, '') || '1', 10));
      const diffB = Math.abs((b.difficulty ?? 3) - parseInt(difficultyLevel.replace(/\D/g, '') || '1', 10));
      return diffA - diffB;
    })
    .slice(0, TARGET_CARD_COUNT)
    .map(card => ({
      id: card.id,
      front: card.front,
      back: card.back,
      hint: card.hint,
      example: card.example,
      category: card.category,
      difficulty: card.difficulty ?? 3,
      audio: card.audio,
      aiMetadata: {
        recommendedEase: Number((2.5 - ((card.difficulty ?? 3) - 3) * 0.2).toFixed(2)),
        recommendedIntervalDays: Math.max(1, Math.min(10, (card.difficulty ?? 3))),
        focus: 'Reinforce core vocabulary in real scenarios',
        tags: [card.category, 'fallback'],
        rationale: 'Derived from curated offline deck; adjust based on learner performance.',
        confidence: 0.4,
      },
    }));

  return {
    cards,
    metadata: {
      categories: availableCategories,
      difficultyLevel,
      generatedAt: new Date().toISOString(),
      source: 'fallback',
      strategyNotes: 'Generated from curated offline dataset due to AI deck unavailability.',
    },
  };
};

export const usePrefetchedDeck = (categoryFilter?: string) => {
  const { profile } = useProfile();
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  const [deck, setDeck] = useState<PrefetchedDeck | null>(null);
  const [source, setSource] = useState<DeckSource>('prefetched');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [record, setRecord] = useState<UserDeckRow | null>(null);

  const categories = useMemo(() => getPreferredCategories(profile), [profile]);
  const difficultyLevel = useMemo(() => getPreferredDifficulty(profile), [profile]);
  const learningGoals = useMemo(() => getLearningGoals(profile), [profile]);

  const loadDeck = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await ensureDeckForProfile(supabase, profile, {
        categories,
        difficultyLevel,
        learningGoals,
      });

      setDeck(result.deck);
      setSource('prefetched');
      setRecord(result.record);
    } catch (err) {
      const fallback = buildFallbackDeck(categories, difficultyLevel);
      setDeck(fallback);
      setSource('fallback');
      setError(err as Error);
      setRecord(null);

      toast({
        title: 'Offline deck in use',
        description: 'Unable to generate an AI deck right now. Showing curated cards instead.',
      });
    } finally {
      setLoading(false);
    }
  }, [categories, difficultyLevel, learningGoals, profile, supabase, toast]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  const filteredDeck = useMemo(() => {
    if (!deck) return null;
    if (!categoryFilter) return deck;
    return {
      ...deck,
      cards: deck.cards.filter(card => card.category === categoryFilter),
    };
  }, [deck, categoryFilter]);

  const cardCount = filteredDeck?.cards.length ?? 0;

  return {
    deck: filteredDeck,
    loading,
    error,
    source,
    refresh: loadDeck,
    hasCards: cardCount > 0,
    record,
  };
};

