import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock, 
  Star,
  Play,
  BarChart3,
  Award,
  Flame
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  streak: number;
  points: number;
  level: number;
  weeklyProgress: number;
  retentionRate: number;
  averageTime: number;
}

interface CategoryProgress {
  category: string;
  total: number;
  mastered: number;
  progress: number;
  color: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCards: 0,
    masteredCards: 0,
    learningCards: 0,
    newCards: 0,
    streak: 0,
    points: 0,
    level: 1,
    weeklyProgress: 0,
    retentionRate: 0,
    averageTime: 0
  });

  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [weeklyData, setWeeklyData] = useState([]);

  const loadDashboardData = async () => {
    // Mock data for now
    setStats({
      totalCards: 150,
      masteredCards: 45,
      learningCards: 30,
      newCards: 75,
      streak: 7,
      points: 1250,
      level: 3,
      weeklyProgress: 65,
      retentionRate: 78,
      averageTime: 12
    });

    setCategoryProgress([
      { category: 'Family', total: 30, mastered: 12, progress: 40, color: '#3B82F6' },
      { category: 'Work', total: 25, mastered: 8, progress: 32, color: '#10B981' },
      { category: 'Travel', total: 20, mastered: 15, progress: 75, color: '#F59E0B' },
      { category: 'Food', total: 18, mastered: 6, progress: 33, color: '#EF4444' },
      { category: 'Shopping', total: 15, mastered: 4, progress: 27, color: '#8B5CF6' }
    ]);

    setWeeklyData([
      { day: 'Mon', cards: 12, time: 15 },
      { day: 'Tue', cards: 18, time: 22 },
      { day: 'Wed', cards: 8, time: 10 },
      { day: 'Thu', cards: 25, time: 30 },
      { day: 'Fri', cards: 15, time: 18 },
      { day: 'Sat', cards: 20, time: 25 },
      { day: 'Sun', cards: 14, time: 17 }
    ]);
  };

  useEffect(() => {
    // TODO: Fetch real data from Supabase
    loadDashboardData();
  }, []);

  const getLevelColor = (level: number) => {
    if (level <= 2) return 'text-green-600';
    if (level <= 4) return 'text-blue-600';
    if (level <= 6) return 'text-purple-600';
    return 'text-orange-600';
  };

  const getLevelTitle = (level: number) => {
    if (level <= 2) return 'Beginner';
    if (level <= 4) return 'Intermediate';
    if (level <= 6) return 'Advanced';
    return 'Expert';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome back!</h1>
          <p className="text-gray-600">Ready to continue your Arabic journey?</p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Cards</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalCards}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Streak</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.streak} days</p>
                  </div>
                  <Flame className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Points</p>
                    <p className="text-2xl font-bold text-green-600">{stats.points}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Level</p>
                    <p className={`text-2xl font-bold ${getLevelColor(stats.level)}`}>
                      {stats.level} - {getLevelTitle(stats.level)}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Study Session */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Play className="w-6 h-6 text-blue-600" />
                  <span>Today's Study Session</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.newCards}</div>
                    <div className="text-sm text-gray-600">New Cards</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.learningCards}</div>
                    <div className="text-sm text-gray-600">Review Cards</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{stats.averageTime}min</div>
                    <div className="text-sm text-gray-600">Est. Time</div>
                  </div>
                </div>
                
                <Button
                  onClick={() => navigate('/app/practice/family')}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 text-lg font-semibold"
                >
                  Start Practice Session
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-6 h-6 text-green-600" />
                  <span>Weekly Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-green-600">{stats.weeklyProgress}%</div>
                  <div className="text-sm text-gray-600">Goal Progress</div>
                </div>
                <Progress value={stats.weeklyProgress} className="mb-4" />
                <div className="text-sm text-gray-500 text-center">
                  {stats.masteredCards} of {stats.totalCards} cards mastered
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                  <span>Retention Rate</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.retentionRate}%</div>
                  <div className="text-sm text-gray-600">Memory Retention</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Category Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <span>Category Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryProgress.map((category, index) => (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{category.category}</h3>
                    <Badge variant="secondary" style={{ backgroundColor: category.color + '20', color: category.color }}>
                      {category.progress}%
                    </Badge>
                  </div>
                  <Progress value={category.progress} className="mb-2" />
                  <div className="text-sm text-gray-600">
                    {category.mastered} of {category.total} cards
                  </div>
                </motion.div>
              ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-6 h-6 text-blue-600" />
                <span>Weekly Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="cards" stroke="#3B82F6" strokeWidth={3} />
                  <Line type="monotone" dataKey="time" stroke="#10B981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
