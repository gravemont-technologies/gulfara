import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Calendar, 
  Target, 
  Trophy, 
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  Settings,
  Edit
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface UserProfile {
  name: string;
  email: string;
  joinDate: Date;
  level: number;
  totalPoints: number;
  streak: number;
  totalCards: number;
  masteredCards: number;
  averageAccuracy: number;
  totalStudyTime: number;
  favoriteCategory: string;
  learningGoal: string[];
  difficultyLevel: string;
}

interface StudyStats {
  dailyCards: number[];
  weeklyAccuracy: number[];
  monthlyProgress: number[];
  categoryMastery: Array<{
    category: string;
    mastered: number;
    total: number;
    progress: number;
  }>;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Ahmed Al-Rashid',
    email: 'ahmed@example.com',
    joinDate: new Date('2024-01-01'),
    level: 3,
    totalPoints: 1250,
    streak: 7,
    totalCards: 150,
    masteredCards: 45,
    averageAccuracy: 78,
    totalStudyTime: 24,
    favoriteCategory: 'Family',
    learningGoal: ['Work', 'Family'],
    difficultyLevel: 'B1'
  });

  const [stats, setStats] = useState<StudyStats>({
    dailyCards: [12, 18, 8, 25, 15, 20, 14],
    weeklyAccuracy: [65, 70, 75, 80, 78, 82, 85],
    monthlyProgress: [20, 35, 45, 60, 75, 85, 90],
    categoryMastery: [
      { category: 'Family', mastered: 12, total: 30, progress: 40 },
      { category: 'Work', mastered: 8, total: 25, progress: 32 },
      { category: 'Travel', mastered: 15, total: 20, progress: 75 },
      { category: 'Food', mastered: 6, total: 18, progress: 33 },
      { category: 'Shopping', mastered: 4, total: 15, progress: 27 }
    ]
  });

  const [isEditing, setIsEditing] = useState(false);

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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const weeklyData = [
    { day: 'Mon', cards: stats.dailyCards[0], accuracy: stats.weeklyAccuracy[0] },
    { day: 'Tue', cards: stats.dailyCards[1], accuracy: stats.weeklyAccuracy[1] },
    { day: 'Wed', cards: stats.dailyCards[2], accuracy: stats.weeklyAccuracy[2] },
    { day: 'Thu', cards: stats.dailyCards[3], accuracy: stats.weeklyAccuracy[3] },
    { day: 'Fri', cards: stats.dailyCards[4], accuracy: stats.weeklyAccuracy[4] },
    { day: 'Sat', cards: stats.dailyCards[5], accuracy: stats.weeklyAccuracy[5] },
    { day: 'Sun', cards: stats.dailyCards[6], accuracy: stats.weeklyAccuracy[6] }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Profile</h1>
              <p className="text-gray-600">Your Arabic learning journey</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </Button>
          </div>
        </motion.div>

        {/* Profile Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8"
        >
          {/* User Info */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="w-16 h-16">
                  <AvatarImage src="/api/placeholder/64/64" />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xl font-bold">
                    {profile.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{profile.name}</h2>
                  <p className="text-gray-600">{profile.email}</p>
                  <Badge variant="secondary" className="mt-1">
                    Member since {formatDate(profile.joinDate)}
                  </Badge>
              </div>
            </div>
            
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Level</span>
                  <Badge className={`${getLevelColor(profile.level)} bg-opacity-20`}>
                    {profile.level} - {getLevelTitle(profile.level)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Difficulty</span>
                  <span className="text-sm font-medium">{profile.difficultyLevel}</span>
              </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Favorite Category</span>
                  <span className="text-sm font-medium">{profile.favoriteCategory}</span>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* Stats Overview */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span>Learning Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{profile.totalPoints}</div>
                  <div className="text-xs text-gray-600">Total Points</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{profile.streak}</div>
                  <div className="text-xs text-gray-600">Day Streak</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{profile.masteredCards}</div>
                  <div className="text-xs text-gray-600">Mastered</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{profile.averageAccuracy}%</div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
          </div>
            </CardContent>
        </Card>
        
          {/* Progress */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-600" />
                <span>Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Cards Mastered</span>
                    <span className="text-sm font-medium">{profile.masteredCards}/{profile.totalCards}</span>
                  </div>
                  <Progress value={(profile.masteredCards / profile.totalCards) * 100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Study Time</span>
                    <span className="text-sm font-medium">{formatTime(profile.totalStudyTime * 60)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Average: {Math.round(profile.totalStudyTime / 7)}h per week
                  </div>
                </div>
          </div>
            </CardContent>
        </Card>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
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
                    <Line type="monotone" dataKey="cards" stroke="#3B82F6" strokeWidth={3} name="Cards" />
                    <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={3} name="Accuracy %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
        </Card>
          </motion.div>

          {/* Category Mastery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  <span>Category Mastery</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.categoryMastery}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="progress" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
        </Card>
          </motion.div>
      </div>

        {/* Learning Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-purple-600" />
                <span>Learning Goals & Preferences</span>
              </CardTitle>
        </CardHeader>
        <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Learning Goals</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.learningGoal.map((goal, index) => (
                      <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                        {goal}
                  </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Study Preferences</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Difficulty Level</span>
                      <Badge variant="outline">{profile.difficultyLevel}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Preferred Category</span>
                      <Badge variant="outline">{profile.favoriteCategory}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Study Time</span>
                      <span className="text-sm font-medium">{formatTime(profile.totalStudyTime * 60)}</span>
                    </div>
                  </div>
                </div>
          </div>
        </CardContent>
      </Card>
        </motion.div>
      </div>
    </div>
  );
}