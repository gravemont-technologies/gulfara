import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Target, TrendingUp, Calendar, Play, Coins, Flame, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalCoins: number;
  currentStreak: number;
  cardsStudied: number;
  accuracy: number;
  dailyGoal: number;
  dailyProgress: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats] = useState<DashboardStats>({
    totalCoins: 1247,
    currentStreak: 12,
    cardsStudied: 89,
    accuracy: 87,
    dailyGoal: 20,
    dailyProgress: 15,
  });

  const progressPercentage = (stats.dailyProgress / stats.dailyGoal) * 100;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4 animate-fade-in-up">
        <h1 className="text-4xl font-bold text-foreground">مرحباً بك!</h1>
        <p className="text-xl text-muted-foreground">Ready to continue your Arabic journey?</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
        {/* Daily Progress */}
        <Card className="flashcard">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              <span>Daily Goal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.dailyProgress} / {stats.dailyGoal} cards</span>
                <span className="font-semibold">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.dailyGoal - stats.dailyProgress} cards remaining
            </p>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="flashcard">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Flame className="w-5 h-5 text-streak-fire" />
              <span>Current Streak</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-streak-fire">{stats.currentStreak}</div>
              <p className="text-sm text-muted-foreground">days in a row</p>
              <div className="streak-badge inline-flex items-center space-x-1">
                <Star className="w-4 h-4" />
                <span>On fire!</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Coins */}
        <Card className="flashcard">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Coins className="w-5 h-5 text-coin-gold" />
              <span>Total Coins</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-coin-gold">{stats.totalCoins.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">earned coins</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/rewards')}
                className="text-xs"
              >
                Spend Coins
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Section */}
      <div className="text-center space-y-6 animate-fade-in-up">
        <Button 
          onClick={() => navigate('/srs')}
          className="luxury-button text-lg px-8 py-4 h-auto"
        >
          <Play className="w-6 h-6 mr-2" />
          Start SRS Session
        </Button>
        
        <p className="text-sm text-muted-foreground">
          Continue where you left off
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
        <Card className="text-center p-4">
          <div className="space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-primary" />
            <div className="text-2xl font-bold">{stats.cardsStudied}</div>
            <p className="text-sm text-muted-foreground">Cards Studied</p>
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <div className="space-y-2">
            <TrendingUp className="w-8 h-8 mx-auto text-success" />
            <div className="text-2xl font-bold">{stats.accuracy}%</div>
            <p className="text-sm text-muted-foreground">Accuracy</p>
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <div className="space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-accent" />
            <div className="text-2xl font-bold">4</div>
            <p className="text-sm text-muted-foreground">Active Decks</p>
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <div className="space-y-2">
            <Star className="w-8 h-8 mx-auto text-coin-gold" />
            <div className="text-2xl font-bold">Level 7</div>
            <p className="text-sm text-muted-foreground">Current Level</p>
          </div>
        </Card>
      </div>
    </div>
  );
}