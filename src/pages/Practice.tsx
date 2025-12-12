import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Trophy,
  Flame,
  Clock,
  Target
} from 'lucide-react';
import GulfaraFlashcard from '@/components/GulfaraFlashcard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { srsEngine, type SRSData, type ReviewResult } from '@/services/srsEngine';
import type { FlashcardContext } from '@/services/aiAdapter';
import { useProfile } from '@/contexts/ProfileContext';
import { usePrefetchedDeck } from '@/hooks/usePrefetchedDeck';
import type { PrefetchedDeck } from '@/services/deckPrefetcher';
import type { ProfileRecord } from '@/hooks/useEnsureProfile';
import { useSupabaseClient } from '@/supabase/client';
import { queueAction } from '@/services/sync';
import { ensureDeckForProfile, getLearningGoals, getPreferredDifficulty } from '@/services/deckManager';
import { useToast } from '@/hooks/use-toast';
import { offlineQueue, flushQueuedReviews } from '@/lib/offlineQueue';
import { ReviewRequestPayload, ReviewResponsePayload } from '@/lib/validation';
import { logger } from '@/lib/logger';

interface PracticeSession {
  cards: SRSData[];
  currentIndex: number;
  correct: number;
  incorrect: number;
  startTime: Date;
  streak: number;
  points: number;
}

const createReviewId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

interface PracticeOverrides {
  profile: ProfileRecord;
  deck: PrefetchedDeck;
}

interface PracticeProps {
  overrides?: PracticeOverrides;
}

function PracticeContent({ overrides }: PracticeProps = {}) {
  const { scenario } = useParams<{ scenario: string }>();
  const navigate = useNavigate();
  const overrideActive = Boolean(overrides);

  const profileContext = !overrideActive ? useProfile() : null;
  const { toast } = useToast();
  const supabase = overrideActive ? null : useSupabaseClient();

  const deckResponse = overrideActive
    ? {
        deck: overrides!.deck,
        loading: false,
        source: 'prefetched' as const,
        hasCards: overrides!.deck.cards.length > 0,
        refresh: async () => {},
        error: null,
      }
    : usePrefetchedDeck(scenario);

  const deck = deckResponse.deck;
  const deckLoading = deckResponse.loading;
  const deckSource = deckResponse.source;
  const hasCards = deckResponse.hasCards;
  const refresh = deckResponse.refresh;
  const deckCards = deck?.cards ?? [];
  const baseProfile = overrides?.profile ?? profileContext?.profile;
  
  const [session, setSession] = useState<PracticeSession>({
    cards: [],
    currentIndex: 0,
    correct: 0,
    incorrect: 0,
    startTime: new Date(),
    streak: 0,
    points: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [answers, setAnswers] = useState<ReviewResult[]>([]);
  const [offlineQueueLength, setOfflineQueueLength] = useState(() => offlineQueue.getAll().length);

  const refreshOfflineQueueLength = useCallback(() => {
    setOfflineQueueLength(offlineQueue.getAll().length);
  }, []);

  const REVIEW_ENDPOINT = '/api/review';
  const REVIEW_MAX_ATTEMPTS = 3;
  const REVIEW_BACKOFF_MS = 250;

  const submitReviewPayload = useCallback(async (payload: ReviewRequestPayload): Promise<ReviewResponsePayload> => {
    for (let attempt = 1; attempt <= REVIEW_MAX_ATTEMPTS; attempt++) {
      const response = await fetch(REVIEW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gulfara-user-id': baseProfile?.id ?? ''
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return response.json();
      }

      const errorText = await response.text();
      if (attempt === REVIEW_MAX_ATTEMPTS) {
        throw new Error(errorText || `Review request failed (${response.status})`);
      }

      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * REVIEW_BACKOFF_MS));
    }

    throw new Error('Review request failed');
  }, []);

  const recordProgress = useCallback(async (srsCard: SRSData, deckCard: { id: string }, result: ReviewResult) => {
    if (!supabase || overrideActive || !baseProfile) return;
    const payload = {
      user_id: baseProfile.id,
      card_id: deckCard.id,
      ease: srsCard.ease,
      interval: srsCard.interval,
      repetitions: srsCard.repetitions,
      quality: result.quality,
      last_review: srsCard.lastReview.toISOString(),
      next_review: srsCard.nextReview.toISOString(),
      mastery: srsEngine.calculateMastery(srsCard),
    };

    try {
      await supabase.from('user_progress').upsert(payload);
    } catch (error) {
      console.warn('Failed to persist user progress, queuing', error);
      await queueAction({ type: 'update_progress', data: payload });
    }
  }, [baseProfile, supabase, overrideActive]);

  const updateProfileStats = useCallback(async (pointsEarned: number, streak: number) => {
    if (!supabase || overrideActive || !baseProfile) return;
    const setProfile = overrideActive ? () => {} : profileContext!.setProfile;
    const payload = {
      coins: (baseProfile.coins ?? 0) + pointsEarned,
      total_points: (baseProfile.total_points ?? 0) + pointsEarned,
      streak: Math.max(baseProfile.streak ?? 0, streak),
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', baseProfile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile({
          ...baseProfile,
          ...data,
        });
      }
    } catch (error) {
      console.warn('Failed to update profile stats, queuing', error);
      await queueAction({
        type: 'update_profile_stats',
        data: {
          id: baseProfile.id,
          ...payload,
        },
      });
    }
  }, [baseProfile, profileContext, overrideActive, supabase]);

  const recordStudySession = useCallback(async (stats: { correct: number; incorrect: number; points: number; durationSeconds: number; categories: string[]; difficultyLevel: string }) => {
    if (!supabase || overrideActive || !baseProfile) return;

    const accuracy = stats.correct + stats.incorrect > 0
      ? Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)
      : 0;

    const sessionPayload = {
      user_id: baseProfile.id,
      category_id: scenario ?? stats.categories[0] ?? null,
      session_type: 'mixed',
      cards_studied: stats.correct + stats.incorrect,
      correct_answers: stats.correct,
      incorrect_answers: stats.incorrect,
      time_spent: stats.durationSeconds,
      points_earned: stats.points,
      accuracy,
      completed_at: new Date().toISOString(),
    };

    try {
      await supabase.from('study_sessions').insert(sessionPayload);
    } catch (error) {
      console.warn('Failed to record study session, queuing', error);
      await queueAction({
        type: 'insert_session',
        data: sessionPayload,
      });
    }

    await updateProfileStats(stats.points, session.streak);

    try {
      await ensureDeckForProfile(supabase, {
        ...baseProfile,
        coins: (baseProfile.coins ?? 0) + stats.points,
        total_points: (baseProfile.total_points ?? 0) + stats.points,
        streak: Math.max(baseProfile.streak ?? 0, session.streak),
      }, {
        categories: stats.categories,
        difficultyLevel: stats.difficultyLevel,
        learningGoals: getLearningGoals(baseProfile),
        force: true,
      });
      await refresh();
    } catch (error) {
      console.warn('Deck regeneration after session failed', error);
    }
  }, [baseProfile, overrideActive, scenario, session.streak, supabase, updateProfileStats, refresh]);

  useEffect(() => {
    if (!baseProfile) {
      return;
    }

    if (deckLoading) {
      setIsLoading(true);
      return;
    }

    const now = new Date();
    const srsCards: SRSData[] = deckCards.map((card) => ({
      cardId: card.id,
      userId: baseProfile.id,
      ease: 2.5,
      interval: 1,
      repetitions: 0,
      lastReview: now,
      nextReview: now,
      quality: 0,
    }));

    setSession({
      cards: srsCards,
      currentIndex: 0,
      correct: 0,
      incorrect: 0,
      startTime: now,
      streak: 0,
      points: 0,
    });
    setShowResults(false);
    setSessionComplete(false);
    setAnswers([]);
    setIsLoading(false);
  }, [baseProfile, deckCards, deckLoading]);

  const currentDeckCard = useMemo(() => deckCards[session.currentIndex], [deckCards, session.currentIndex]);

  const handleAnswer = async (correct: boolean, timeSpent: number, _cardContext: FlashcardContext) => {
    if (!baseProfile) return;
    const currentCard = session.cards[session.currentIndex];
    if (!currentCard || !currentDeckCard) return;

    // Update session stats
    const newCorrect = correct ? session.correct + 1 : session.correct;
    const newIncorrect = correct ? session.incorrect : session.incorrect + 1;
    const newStreak = correct ? session.streak + 1 : 0;
    const pointsEarned = correct ? 10 + (newStreak * 5) : 2;
    const newPoints = session.points + pointsEarned;
    const isLastCard = session.currentIndex >= session.cards.length - 1;
    const sessionStart = session.startTime;

    // Process with SRS engine
    const reviewResult: ReviewResult = {
      cardId: currentCard.cardId,
      quality: correct ? 4 : 1,
      timeSpent,
      correct
    };

    const reviewId = createReviewId();

    const reviewPayload: ReviewRequestPayload = {
      userId: baseProfile.id,
      cardId: currentDeckCard.id,
      quality: reviewResult.quality,
      timeSpent,
      correct,
      pointsEarned,
      reviewId
    };

    let updatedCard = currentCard;
    try {
      const reviewBody = await submitReviewPayload(reviewPayload);
      const serverSrs = reviewBody.srsData;
      if (serverSrs) {
        updatedCard = {
          ...currentCard,
          ease: serverSrs.ease,
          interval: serverSrs.interval,
          repetitions: serverSrs.repetitions,
          lastReview: new Date(serverSrs.lastReview ?? serverSrs.last_review),
          nextReview: new Date(serverSrs.nextReview ?? serverSrs.next_review),
          quality: serverSrs.quality
        };
      }
      flushQueuedReviews().then(refreshOfflineQueueLength).catch((error) => {
        logger.warn('Failed to flush offline queue after review', { reviewId, error: (error as Error).message });
      });
    } catch (error) {
      logger.warn('Review API unavailable, queuing payload', { reviewId, message: (error as Error).message, userId: baseProfile.id, cardId: currentDeckCard.id });
      offlineQueue.add(reviewPayload);
      refreshOfflineQueueLength();
      toast({
        title: 'Offline progress saved',
        description: 'We will sync this review when connectivity returns.',
        variant: 'destructive',
        duration: 5000,
      });
      updatedCard = srsEngine.processReview(currentCard, reviewResult);
    }

    // Update session
    setSession(prev => ({
      ...prev,
      correct: newCorrect,
      incorrect: newIncorrect,
      streak: newStreak,
      points: newPoints,
      cards: prev.cards.map((card, index) => 
        index === prev.currentIndex ? updatedCard : card
      )
    }));
    setAnswers(prev => [...prev, reviewResult]);

    await recordProgress(updatedCard, currentDeckCard, reviewResult);

    // Check if session is complete
    if (isLastCard) {
      const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStart.getTime()) / 1000));
      setSessionComplete(true);
      setShowResults(true);

      await recordStudySession({
        correct: newCorrect,
        incorrect: newIncorrect,
        points: newPoints,
        durationSeconds,
        categories: deck?.metadata?.categories ?? (scenario ? [scenario] : []),
        difficultyLevel: deck?.metadata?.difficultyLevel ?? getPreferredDifficulty(baseProfile),
      });
    } else {
      // Move to next card
      const nextDelay = overrideActive ? 0 : 1500;
      setTimeout(() => {
        setSession(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1
        }));
      }, nextDelay);
    }
  };

  const handleNext = () => {
    if (session.currentIndex < session.cards.length - 1) {
      setSession(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1
      }));
    }
  };

  const restartSession = () => {
    setSession(prev => ({
      ...prev,
      currentIndex: 0,
      correct: 0,
      incorrect: 0,
      startTime: new Date(),
      streak: 0,
      points: 0
    }));
    setShowResults(false);
    setSessionComplete(false);
  };

  const getProgress = () => {
    if (session.cards.length === 0) return 0;
    return ((session.currentIndex + 1) / session.cards.length) * 100;
  };

  const getAccuracy = () => {
    const total = session.correct + session.incorrect;
    return total > 0 ? Math.round((session.correct / total) * 100) : 0;
  };

  const getTimeSpent = () => {
    const now = new Date();
    const diff = now.getTime() - session.startTime.getTime();
    return Math.round(diff / 1000 / 60); // minutes
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Practice Session</h2>
          <p className="text-gray-600">Preparing your Arabic flashcards...</p>
        </motion.div>
      </div>
    );
  }

  if (!hasCards && !deckLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <Card className="max-w-md p-8">
          <CardContent className="space-y-4 text-center">
            <h2 className="text-2xl font-semibold text-gray-800">No cards ready yet</h2>
            <p className="text-gray-600">
              We couldn't find cards for this category. Try refreshing the deck or update your onboarding preferences.
            </p>
            <Button onClick={() => refresh()}>Refresh deck</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionComplete && showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Session Complete!</h1>
            <p className="text-gray-600">Great job on your Arabic practice</p>
          </motion.div>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-600">{session.correct}</div>
                  <div className="text-sm text-gray-600">Correct</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-600">{session.incorrect}</div>
                  <div className="text-sm text-gray-600">Incorrect</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">{getAccuracy()}%</div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600">{session.points}</div>
                  <div className="text-sm text-gray-600">Points</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex space-x-4">
            <Button
              onClick={() => navigate('/app')}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              onClick={restartSession}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Practice Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = session.cards[session.currentIndex];
  if (!currentCard) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/app')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              <Flame className="w-4 h-4 mr-1" />
              {session.streak} streak
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Target className="w-4 h-4 mr-1" />
              {session.points} points
            </Badge>
            {offlineQueueLength > 0 && (
              <span className="text-xs text-orange-500 font-semibold ml-2">
                {offlineQueueLength} review{offlineQueueLength > 1 ? 's' : ''} queued
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Card {session.currentIndex + 1} of {session.cards.length}
            {deckSource === 'fallback' && (
              <span className="ml-2 text-xs text-orange-500">
                (offline deck)
              </span>
            )}
            </span>
            <span className="text-sm text-gray-600">
              {getAccuracy()}% accuracy
            </span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{session.correct}</div>
            <div className="text-xs text-gray-600">Correct</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{session.incorrect}</div>
            <div className="text-xs text-gray-600">Incorrect</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{getTimeSpent()}m</div>
            <div className="text-xs text-gray-600">Time</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">{session.points}</div>
            <div className="text-xs text-gray-600">Points</div>
          </div>
        </div>

        {/* Flashcard */}
        <AnimatePresence mode="wait">
          <motion.div
            key={session.currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentCard && currentDeckCard ? (
              <GulfaraFlashcard
                card={{
                  id: currentDeckCard.id,
                  category: currentDeckCard.category,
                  difficulty: currentDeckCard.difficulty,
                  front: currentDeckCard.front,
                  back: currentDeckCard.back,
                  hint: currentDeckCard.hint ?? '',
                  example: currentDeckCard.example ?? '',
                  audio: currentDeckCard.audio,
                  mastery: srsEngine.calculateMastery(currentCard),
                  nextReview: currentCard.nextReview.toISOString(),
                }}
                onAnswer={handleAnswer}
                onNext={handleNext}
                progress={getProgress()}
                streak={session.streak}
              />
            ) : (
              <Card className="p-6">
                <CardContent className="text-center space-y-4">
                  <p className="text-gray-600">
                    We're preparing your next set of cards. Please refresh the deck or choose a different scenario.
                  </p>
                  <Button onClick={() => refresh()}>Refresh deck</Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Practice(props: PracticeProps = {}) {
  return (
    <ErrorBoundary>
      <PracticeContent {...props} />
    </ErrorBoundary>
  );
}

