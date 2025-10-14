import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Play } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DeckStudy() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Mock deck data - in real app this would come from API
  const deck = {
    id: deckId,
    name: language === 'ar' ? 'المفردات الأساسية' : 'Basic Vocabulary',
    description: language === 'ar' ? 'تعلم المفردات الأساسية في اللغة العربية' : 'Learn essential Arabic vocabulary',
    cards: 50,
    progress: 80,
    difficulty: language === 'ar' ? 'متوسط' : 'Intermediate'
  };

  const sampleCards = [
    { front: 'مرحبا', back: 'Hello' },
    { front: 'كتاب', back: 'Book' },
    { front: 'مدرسة', back: 'School' },
    { front: 'صديق', back: 'Friend' },
    { front: 'بيت', back: 'House' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/decks')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <p className="text-muted-foreground">{deck.description}</p>
        </div>
      </div>

      {/* Deck Info */}
      <Card className="flashcard">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <span>{language === 'ar' ? 'معلومات المجموعة' : 'Deck Information'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{deck.cards}</div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'بطاقات' : 'Cards'}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{deck.progress}%</div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مكتمل' : 'Complete'}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{deck.difficulty}</div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الصعوبة' : 'Difficulty'}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-streak-fire">12</div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'للمراجعة' : 'Due Today'}</p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-center pt-4">
            <Button 
              className="luxury-button"
              onClick={() => navigate('/srs')}
            >
              <Play className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'بدء الدراسة' : 'Start Studying'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Cards Preview */}
      <Card className="flashcard">
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'معاينة البطاقات' : 'Card Preview'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleCards.slice(0, 6).map((card, index) => (
              <div key={index} className="border border-border rounded-lg p-4 text-center space-y-2">
                <div className="text-lg font-bold text-primary" dir="rtl">{card.front}</div>
                <div className="text-sm text-muted-foreground">{card.back}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}