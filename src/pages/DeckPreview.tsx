import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Play, Eye, Download } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DeckPreview() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Mock deck data
  const deck = {
    id: deckId,
    name: language === 'ar' ? 'العبارات الشائعة' : 'Common Phrases',
    author: language === 'ar' ? 'أحمد محمد' : 'Ahmad Mohammed',
    description: language === 'ar' ? 'تعلم العبارات الأكثر استخداماً في المحادثات اليومية' : 'Learn the most commonly used phrases in daily conversations',
    cards: 30,
    downloads: 1250,
    rating: 4.8,
    tags: language === 'ar' ? ['محادثة', 'يومي', 'مبتدئ'] : ['conversation', 'daily', 'beginner'],
    difficulty: language === 'ar' ? 'مبتدئ' : 'Beginner'
  };

  const sampleCards = [
    { front: 'كيف حالك؟', back: 'How are you?' },
    { front: 'أين الحمام؟', back: 'Where is the bathroom?' },
    { front: 'كم الساعة؟', back: 'What time is it?' },
    { front: 'أريد القائمة من فضلك', back: 'I would like the menu please' },
    { front: 'هل تتكلم الإنجليزية؟', back: 'Do you speak English?' },
    { front: 'شكراً جزيلاً', back: 'Thank you very much' }
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
          <p className="text-muted-foreground">{language === 'ar' ? 'بواسطة' : 'by'} {deck.author}</p>
        </div>
      </div>

      {/* Deck Overview */}
      <Card className="flashcard">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {deck.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">{tag}</Badge>
              ))}
            </div>
            
            <p className="text-lg">{deck.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{deck.cards}</div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'بطاقات' : 'Cards'}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{deck.rating}★</div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'التقييم' : 'Rating'}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{deck.downloads.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تحميلات' : 'Downloads'}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{deck.difficulty}</div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الصعوبة' : 'Difficulty'}</p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-center pt-4">
              <Button 
                variant="outline"
                onClick={() => {/* Add to library logic */}}
              >
                <Download className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إضافة للمكتبة' : 'Add to Library'}
              </Button>
              <Button 
                className="luxury-button"
                onClick={() => navigate(`/deck/${deckId}/study`)}
              >
                <Play className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'بدء الدراسة' : 'Start Studying'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Cards */}
      <Card className="flashcard">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Eye className="w-5 h-5 text-primary" />
            <span>{language === 'ar' ? 'معاينة البطاقات' : 'Sample Cards'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleCards.map((card, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary mb-2" dir="rtl">{card.front}</div>
                  <div className="w-12 h-px bg-border mx-auto" />
                </div>
                <div className="text-center text-muted-foreground">{card.back}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}