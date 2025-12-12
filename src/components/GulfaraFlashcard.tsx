import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RotateCcw, CheckCircle, XCircle, Lightbulb, Volume2 } from 'lucide-react';
import { FlashcardContext } from '@/services/aiAdapter';

export interface FlashcardData extends Omit<FlashcardContext, 'difficulty'> {
  id: string;
  difficulty: number;
  mastery: number;
  nextReview: string;
}

interface GulfaraFlashcardProps {
  card: FlashcardData;
  onAnswer: (correct: boolean, timeSpent: number, context: FlashcardContext) => void;
  onNext: () => void;
  progress: number;
  streak: number;
}

export default function GulfaraFlashcard({ 
  card, 
  onAnswer, 
  onNext, 
  progress, 
  streak 
}: GulfaraFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Date.now() - startTime);
    }, 100);

    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false);
    setIsRevealed(false);
    setTimeSpent(0);
    setStartTime(Date.now());
  }, [card.id]);

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleAnswer = (correct: boolean) => {
    onAnswer(correct, timeSpent, {
      cardId: card.id,
      front: card.front,
      back: card.back,
      hint: card.hint,
      example: card.example,
      category: card.category,
      difficulty: card.difficulty,
    });
    setTimeout(() => {
      onNext();
    }, 1500);
  };

  const playAudio = () => {
    if (card.audio) {
      const audio = new Audio(card.audio);
      audio.play().catch(console.error);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-100 text-green-800';
    if (difficulty <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return 'Easy';
    if (difficulty <= 3) return 'Medium';
    return 'Hard';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress and Streak */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Progress: {Math.round(progress)}%
          </div>
          <Progress value={progress} className="w-32" />
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            🔥 {streak} streak
          </Badge>
          <Badge className={getDifficultyColor(card.difficulty)}>
            {getDifficultyLabel(card.difficulty)}
          </Badge>
        </div>
      </div>

      {/* Flashcard */}
      <motion.div
        className="relative w-full h-96 perspective-1000"
        style={{ perspective: '1000px' }}
      >
        <motion.div
          className="relative w-full h-full transform-style-preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Front of card */}
          <Card className="absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
            <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
              <div className="mb-4">
                <Badge variant="outline" className="mb-4">
                  {card.category}
                </Badge>
              </div>
              <motion.h2
                className={`text-3xl font-bold text-gray-800 mb-6 transition ${isRevealed ? 'blur-0' : 'blur-md select-none'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {card.front}
              </motion.h2>

              {card.audio && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playAudio}
                  className="mb-4"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Listen
                </Button>
              )}

              <div className="space-y-3 w-full">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setIsRevealed(true)}
                    variant={isRevealed ? 'secondary' : 'default'}
                    className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
                  >
                    {isRevealed ? 'Word Revealed' : 'Reveal Word'}
                  </Button>
                  <Button
                    onClick={handleFlip}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    Show English
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowHint(!showHint)}
                  className="w-full"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </Button>
              </div>

              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <p className="text-sm text-yellow-800">{card.hint}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Back of card */}
          <Card className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
              <div className="mb-4">
                <Badge variant="outline" className="mb-4">
                  Answer
                </Badge>
              </div>

              <motion.h2 
                className="text-3xl font-bold text-gray-800 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {card.back}
              </motion.h2>

              {card.example && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6 p-4 bg-white/80 rounded-lg border"
                >
                  <p className="text-sm text-gray-600 mb-2">Example:</p>
                  <p className="text-lg font-medium text-gray-800">{card.example}</p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex space-x-4"
              >
                <Button
                  variant="destructive"
                  onClick={() => handleAnswer(false)}
                  className="flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Incorrect</span>
                </Button>
                <Button
                  onClick={() => handleAnswer(true)}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Correct</span>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 text-sm text-gray-500"
              >
                Time: {Math.round(timeSpent / 1000)}s
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Mastery indicator */}
      <div className="mt-6 text-center">
        <div className="text-sm text-gray-600 mb-2">Mastery Level</div>
        <Progress value={card.mastery} className="w-full" />
        <div className="text-xs text-gray-500 mt-1">
          {card.mastery}% mastered
        </div>
      </div>
    </div>
  );
}
