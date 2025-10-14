import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, Coins, X, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FlashCard {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
}

const sampleCards: FlashCard[] = [
  {
    id: "1",
    front: "مرحبا",
    back: "Hello / Welcome",
    difficulty: "easy"
  },
  {
    id: "2", 
    front: "كتاب",
    back: "Book",
    difficulty: "easy"
  },
  {
    id: "3",
    front: "مدرسة",
    back: "School",
    difficulty: "medium"
  },
  {
    id: "4",
    front: "صديق",
    back: "Friend",
    difficulty: "medium"
  },
  {
    id: "5",
    front: "استطيع",
    back: "I can / I am able to",
    difficulty: "hard"
  }
];

export default function SRSSession() {
  const navigate = useNavigate();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [coins, setCoins] = useState(1247);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [completedCards, setCompletedCards] = useState(0);
  
  const currentCard = sampleCards[currentCardIndex];
  const totalCards = sampleCards.length;
  const progress = ((currentCardIndex + (showAnswer ? 0.5 : 0)) / totalCards) * 100;

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const handleAnswer = (difficulty: "easy" | "medium" | "hard") => {
    // Award/deduct coins based on difficulty
    const coinRewards = { easy: 5, medium: 1, hard: -10 };
    const earnedCoins = coinRewards[difficulty];
    
    setCoins(prev => prev + earnedCoins);
    setSessionCoins(prev => prev + earnedCoins);
    setCompletedCards(prev => prev + 1);

    // Move to next card
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // Session complete
      setTimeout(() => {
        navigate('/', { state: { sessionComplete: true, coinsEarned: sessionCoins + earnedCoins } });
      }, 1000);
    }
  };

  const handleExit = () => {
    navigate('/');
  };

  useEffect(() => {
    // Reset card state when index changes
    setShowAnswer(false);
  }, [currentCardIndex]);

  if (currentCardIndex >= totalCards) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="flashcard max-w-md w-full text-center animate-scale-in">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-success mx-auto" />
              <h2 className="text-2xl font-bold">Session Complete!</h2>
              <div className="space-y-2">
                <div className="coin-counter inline-flex items-center space-x-2 text-lg">
                  <Coins className="w-5 h-5" />
                  <span>+{sessionCoins} coins earned</span>
                </div>
                <p className="text-muted-foreground">{completedCards} cards studied</p>
              </div>
            </div>
            <Button onClick={() => navigate('/')} className="luxury-button w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handleExit}>
            <X className="w-6 h-6" />
          </Button>
          
          <div className="coin-counter flex items-center space-x-2">
            <Coins className="w-4 h-4" />
            <span>{coins.toLocaleString()}</span>
            {sessionCoins > 0 && (
              <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded-full animate-coin-bounce">
                +{sessionCoins}
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{currentCardIndex + 1} / {totalCards}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Flashcard */}
      <div className="max-w-2xl mx-auto">
        <Card className="flashcard min-h-[400px] flex flex-col justify-center animate-scale-in">
          <CardContent className="text-center space-y-8 p-8">
            {/* Card Content */}
            <div className="space-y-6">
              <div className="text-4xl md:text-6xl font-bold text-primary" dir="rtl">
                {currentCard.front}
              </div>
              
              {showAnswer && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="w-16 h-px bg-border mx-auto" />
                  <div className="text-2xl md:text-3xl text-muted-foreground">
                    {currentCard.back}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!showAnswer ? (
              <Button 
                onClick={handleReveal}
                className="luxury-button text-lg px-8 py-3"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reveal Answer
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">How well did you know this?</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => handleAnswer("hard")}
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Difficult (-10 coins)
                  </Button>
                  <Button 
                    onClick={() => handleAnswer("medium")}
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    Good (+1 coin)
                  </Button>
                  <Button 
                    onClick={() => handleAnswer("easy")}
                    variant="outline"
                    className="border-success text-success hover:bg-success hover:text-success-foreground"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Easy (+5 coins)
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}