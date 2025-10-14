import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Star, 
  Gift, 
  Award, 
  Target,
  Flame,
  Zap,
  Crown,
  Medal,
  Gem
} from 'lucide-react';

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  pointsRequired: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface VoucherData {
  id: string;
  code: string;
  description: string;
  pointsRequired: number;
  available: boolean;
  claimed: boolean;
  claimedAt?: Date;
}

export default function Rewards() {
  const [userPoints, setUserPoints] = useState(1250);
  const [userLevel, setUserLevel] = useState(3);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(null);

  const loadRewardsData = () => {
    // Mock badges data
    setBadges([
      {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Complete your first flashcard',
      icon: Star,
        color: 'text-yellow-500',
        pointsRequired: 10,
        unlocked: true,
        unlockedAt: new Date('2024-01-15')
      },
      {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: Flame,
        color: 'text-orange-500',
        pointsRequired: 100,
        unlocked: true,
        unlockedAt: new Date('2024-01-20')
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Answer 10 cards in under 2 minutes',
        icon: Zap,
        color: 'text-blue-500',
        pointsRequired: 200,
        unlocked: true,
        unlockedAt: new Date('2024-01-25')
      },
      {
        id: 'master_100',
        name: 'Century Master',
        description: 'Master 100 flashcards',
        icon: Crown,
        color: 'text-purple-500',
        pointsRequired: 500,
        unlocked: false
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Achieve 95% accuracy for a week',
        icon: Medal,
        color: 'text-green-500',
        pointsRequired: 750,
        unlocked: false
      },
      {
        id: 'arabic_expert',
        name: 'Arabic Expert',
        description: 'Reach level 10',
        icon: Gem,
        color: 'text-red-500',
        pointsRequired: 1000,
        unlocked: false
      }
    ]);

    // Mock vouchers data
    setVouchers([
      {
        id: 'coffee_voucher',
        code: 'GULFARA-COFFEE-2024',
        description: 'Free coffee at participating cafes',
        pointsRequired: 500,
        available: true,
        claimed: false
      },
      {
        id: 'book_voucher',
        code: 'GULFARA-BOOK-2024',
        description: '20% off Arabic learning books',
        pointsRequired: 750,
        available: true,
        claimed: false
      },
      {
        id: 'course_voucher',
        code: 'GULFARA-COURSE-2024',
        description: 'Free online Arabic course',
        pointsRequired: 1000,
        available: true,
        claimed: false
      }
    ]);
  };

  useEffect(() => {
    loadRewardsData();
  }, []);

  const getLevelProgress = () => {
    const currentLevelPoints = (userLevel - 1) * 500;
    const nextLevelPoints = userLevel * 500;
    const progress = ((userPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const getPointsToNextLevel = () => {
    const nextLevelPoints = userLevel * 500;
    return Math.max(0, nextLevelPoints - userPoints);
  };

  const handleClaimVoucher = (voucher: VoucherData) => {
    if (userPoints >= voucher.pointsRequired && !voucher.claimed) {
      setSelectedVoucher(voucher);
      setShowVoucherModal(true);
      
      // Update voucher status
      setVouchers(prev => prev.map(v => 
        v.id === voucher.id 
          ? { ...v, claimed: true, claimedAt: new Date() }
          : v
      ));
      
      // Deduct points
      setUserPoints(prev => prev - voucher.pointsRequired);
    }
  };

  const getBadgeIcon = (badge: BadgeData) => {
    const IconComponent = badge.icon;
    return (
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        badge.unlocked ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gray-200'
      }`}>
        <IconComponent className={`w-6 h-6 ${
          badge.unlocked ? 'text-white' : 'text-gray-400'
        }`} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Rewards & Achievements</h1>
          <p className="text-gray-600">Track your progress and claim rewards</p>
        </motion.div>

        {/* Points and Level */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Total Points</h3>
                  <p className="text-3xl font-bold text-blue-600">{userPoints.toLocaleString()}</p>
                </div>
                <Trophy className="w-12 h-12 text-blue-600" />
        </div>
              <div className="text-sm text-gray-600">
                Earn points by completing flashcards and maintaining streaks
      </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Level {userLevel}</h3>
                  <p className="text-sm text-gray-600">
                    {getPointsToNextLevel()} points to next level
                  </p>
                </div>
                <Award className="w-12 h-12 text-purple-600" />
              </div>
              <Progress value={getLevelProgress()} className="h-2" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Medal className="w-6 h-6 text-yellow-600" />
                <span>Achievement Badges</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {badges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      badge.unlocked 
                        ? 'border-yellow-200 bg-yellow-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {getBadgeIcon(badge)}
                      <div className="flex-1">
                        <h3 className={`font-semibold ${
                          badge.unlocked ? 'text-gray-800' : 'text-gray-500'
                        }`}>
                          {badge.name}
                        </h3>
                        <p className={`text-sm ${
                          badge.unlocked ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {badge.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {badge.pointsRequired} pts
                          </Badge>
                          {badge.unlocked && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              ✓ Unlocked
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Vouchers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="w-6 h-6 text-green-600" />
                <span>Reward Vouchers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vouchers.map((voucher, index) => (
                  <motion.div
                    key={voucher.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      voucher.claimed 
                        ? 'border-green-200 bg-green-50' 
                        : userPoints >= voucher.pointsRequired
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                        <Gift className="w-8 h-8 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {voucher.description}
                      </h3>
                      
                      <div className="mb-4">
                        <Badge variant="secondary" className="mb-2">
                          {voucher.pointsRequired} points
                        </Badge>
                        {voucher.claimed && (
                          <Badge className="bg-green-100 text-green-800">
                            ✓ Claimed
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => handleClaimVoucher(voucher)}
                        disabled={userPoints < voucher.pointsRequired || voucher.claimed}
                        className={`w-full ${
                          voucher.claimed 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : userPoints >= voucher.pointsRequired
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {voucher.claimed ? 'Claimed' : 
                         userPoints >= voucher.pointsRequired ? 'Claim Voucher' : 
                         'Not Enough Points'}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Voucher Modal */}
        {showVoucherModal && selectedVoucher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowVoucherModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Voucher Claimed!
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {selectedVoucher.description}
                </p>
                
                <div className="bg-gray-100 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-600 mb-2">Your voucher code:</p>
                  <p className="text-lg font-mono font-bold text-gray-800">
                    {selectedVoucher.code}
                  </p>
                </div>
                
                <Button
                  onClick={() => setShowVoucherModal(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}