import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Download, Coins, Flame, BookOpen, Target } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface ShareStatsDialogProps {
  stats: {
    level: number;
    totalCoins: number;
    currentStreak: number;
    totalCards: number;
    accuracy: number;
    xp: number;
  };
  badges: Array<{
    name: string;
    earned: boolean;
  }>;
}

export default function ShareStatsDialog({ stats, badges }: ShareStatsDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const shareText = language === 'ar'
    ? `تقدمي في تعلم العربية:\n🎯 المستوى: ${stats.level}\n🪙 العملات: ${stats.totalCoins}\n🔥 السلسلة: ${stats.currentStreak} يوم\n📚 البطاقات: ${stats.totalCards}\n✨ الدقة: ${stats.accuracy}%\n\nانضم إليّ في عربي SRS!`
    : `My Arabic learning progress:\n🎯 Level: ${stats.level}\n🪙 Coins: ${stats.totalCoins}\n🔥 Streak: ${stats.currentStreak} days\n📚 Cards: ${stats.totalCards}\n✨ Accuracy: ${stats.accuracy}%\n\nJoin me on Arabic SRS!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    toast({
      title: language === 'ar' ? 'تم النسخ!' : 'Copied!',
      description: language === 'ar' ? 'تم نسخ إحصائياتك للحافظة.' : 'Your stats have been copied to clipboard.',
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: language === 'ar' ? 'إحصائياتي في تعلم العربية' : 'My Arabic Learning Stats',
        text: shareText,
        url: window.location.origin
      });
    } else {
      handleCopy();
    }
  };

  const earnedBadges = badges.filter(badge => badge.earned);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          {t('shareStats')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('shareStats')}</DialogTitle>
        </DialogHeader>
        
        {/* Stats Card Preview */}
        <Card className="flashcard">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-accent">
                {language === 'ar' ? `المستوى ${stats.level}` : `Level ${stats.level}`}
              </div>
              <p className="text-sm text-muted-foreground">{stats.xp} XP</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  <Coins className="w-4 h-4 text-coin-gold" />
                  <span className="font-bold">{stats.totalCoins}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'عملات' : 'Coins'}
                </p>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  <Flame className="w-4 h-4 text-streak-fire" />
                  <span className="font-bold">{stats.currentStreak}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'أيام' : 'Days'}
                </p>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-bold">{stats.totalCards}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'بطاقات' : 'Cards'}
                </p>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  <Target className="w-4 h-4 text-success" />
                  <span className="font-bold">{stats.accuracy}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'دقة' : 'Accuracy'}
                </p>
              </div>
            </div>
            
            {earnedBadges.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">
                  {language === 'ar' ? 'الشارات المكتسبة' : 'Earned Badges'}
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {earnedBadges.slice(0, 3).map((badge, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {badge.name}
                    </Badge>
                  ))}
                  {earnedBadges.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{earnedBadges.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Share Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCopy} className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'نسخ' : 'Copy'}
          </Button>
          <Button onClick={handleShare} className="luxury-button flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'مشاركة' : 'Share'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}