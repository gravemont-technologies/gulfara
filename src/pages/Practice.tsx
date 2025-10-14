import { useState, useEffect } from 'react';
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
import { srsEngine, type SRSData, type ReviewResult } from '@/services/srsEngine';
import { aiAdapter, type UserPerformance } from '@/services/aiAdapter';

interface PracticeSession {
  cards: SRSData[];
  currentIndex: number;
  correct: number;
  incorrect: number;
  startTime: Date;
  streak: number;
  points: number;
}

export default function Practice() {
  const { scenario } = useParams<{ scenario: string }>();
  const navigate = useNavigate();
  
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

  const loadPracticeSession = async () => {
    setIsLoading(true);
    
    // TODO: Load real cards from Supabase based on scenario
    const mockCards: SRSData[] = [
      {
        cardId: '1',
        userId: 'user1',
        ease: 2.5,
        interval: 1,
        repetitions: 0,
        lastReview: new Date(),
        nextReview: new Date(),
        quality: 0
      },
      {
        cardId: '2',
        userId: 'user1',
        ease: 2.3,
        interval: 3,
        repetitions: 2,
        lastReview: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        nextReview: new Date(),
        quality: 0
      }
    ];

    setSession(prev => ({
      ...prev,
      cards: mockCards,
      currentIndex: 0
    }));
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadPracticeSession();
  }, [scenario]);

  const handleAnswer = async (correct: boolean, timeSpent: number) => {
    const currentCard = session.cards[session.currentIndex];
    if (!currentCard) return;

    // Update session stats
    const newCorrect = correct ? session.correct + 1 : session.correct;
    const newIncorrect = correct ? session.incorrect : session.incorrect + 1;
    const newStreak = correct ? session.streak + 1 : 0;
    const pointsEarned = correct ? 10 + (newStreak * 5) : 2;
    const newPoints = session.points + pointsEarned;

    // Process with SRS engine
    const reviewResult: ReviewResult = {
      cardId: currentCard.cardId,
      quality: correct ? 4 : 1,
      timeSpent,
      correct
    };

    const updatedCard = srsEngine.processReview(currentCard, reviewResult);

    // Update AI adaptation
    const performance: UserPerformance = {
      userId: currentCard.userId,
      lastResult: correct,
      avgScore: newCorrect / (newCorrect + newIncorrect),
      targetDifficulty: srsEngine.calculateDifficulty(updatedCard),
      recentAnswers: [
        { correct, timeSpent, difficulty: srsEngine.calculateDifficulty(updatedCard) }
      ]
    };

    const aiAdjustment = await aiAdapter.adjustDifficulty(performance);

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

    // Check if session is complete
    if (session.currentIndex >= session.cards.length - 1) {
      setSessionComplete(true);
      setShowResults(true);
    } else {
      // Move to next card
      setTimeout(() => {
        setSession(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1
        }));
      }, 1500);
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

  if (showResults) {
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
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Card {session.currentIndex + 1} of {session.cards.length}
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
            <GulfaraFlashcard
              card={{
                id: currentCard.cardId,
                category: scenario || 'General',
                difficulty: srsEngine.calculateDifficulty(currentCard),
                front: 'شلونك؟', // Mock data
                back: 'How are you?',
                hint: 'A common Gulf Arabic greeting',
                example: 'شلونك؟ أنا بخير، شكراً',
                mastery: srsEngine.calculateMastery(currentCard),
                nextReview: currentCard.nextReview.toISOString()
              }}
              onAnswer={handleAnswer}
              onNext={handleNext}
              progress={getProgress()}
              streak={session.streak}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
