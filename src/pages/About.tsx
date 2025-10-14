import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookOpen, Brain, Users, Target, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function About() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send to an API
    toast({
      title: language === 'ar' ? 'تم الإرسال!' : 'Message sent!',
      description: language === 'ar' ? 'شكراً لتواصلك معنا. سنرد عليك قريباً.' : 'Thank you for reaching out. We\'ll get back to you soon.',
    });
    setFormData({ name: '', email: '', message: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">{t('aboutApp')}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {language === 'ar' 
            ? 'تطبيق لتعلم اللغة العربية باستخدام نظام التكرار المتباعد المدعوم بالذكاء الاصطناعي'
            : 'An AI-powered spaced repetition system for learning Arabic with cultural authenticity'
          }
        </p>
      </div>

      {/* Vision */}
      <Card className="flashcard">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-primary" />
            <span>{t('appVision')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg leading-relaxed">
            {language === 'ar'
              ? 'نسعى لجعل تعلم اللغة العربية تجربة ممتعة وفعالة من خلال دمج التقنيات الحديثة مع الثقافة العربية الأصيلة. نؤمن بأن كل متعلم يستحق أدوات تعليمية تحترم هويته الثقافية وتساعده على تحقيق أهدافه اللغوية.'
              : 'We strive to make Arabic learning an enjoyable and effective experience by combining modern technology with authentic Arabic culture. We believe every learner deserves educational tools that respect their cultural identity and help them achieve their language goals.'
            }
          </p>
          <p className="text-muted-foreground">
            {language === 'ar'
              ? 'من خلال استخدام نظام التكرار المتباعد المدعوم بالذكاء الاصطناعي، نضمن أن كل دقيقة تقضيها في التعلم تؤتي ثمارها وتقربك من إتقان اللغة العربية.'
              : 'Through AI-powered spaced repetition, we ensure every minute you spend learning is optimized to bring you closer to Arabic mastery.'
            }
          </p>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="flashcard">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-primary" />
            <span>{t('howItWorks')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h3 className="font-semibold">
                    {language === 'ar' ? 'اختر مجموعة البطاقات' : 'Choose Your Deck'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'ابدأ بالمفردات الأساسية أو اختر موضوعاً محدداً'
                      : 'Start with basic vocabulary or choose a specific topic'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h3 className="font-semibold">
                    {language === 'ar' ? 'ادرس البطاقات' : 'Study Cards'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar'
                      ? 'اكشف الإجابة وقيّم مدى معرفتك بالكلمة'
                      : 'Reveal answers and rate how well you know each word'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h3 className="font-semibold">
                    {language === 'ar' ? 'اكسب العملات' : 'Earn Coins'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar'
                      ? 'احصل على مكافآت مقابل دراستك واستخدمها في المتجر'
                      : 'Get rewarded for studying and use coins in the shop'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-streak-fire text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h3 className="font-semibold">
                    {language === 'ar' ? 'حافظ على السلسلة' : 'Maintain Streak'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar'
                      ? 'ادرس يومياً لتحافظ على سلسلتك وتحقق التقدم'
                      : 'Study daily to maintain your streak and track progress'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="flashcard">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <span>{language === 'ar' ? 'مميزات التطبيق' : 'Key Features'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-3">
              <Brain className="w-12 h-12 text-primary mx-auto" />
              <h3 className="font-semibold">
                {language === 'ar' ? 'ذكاء اصطناعي' : 'AI-Powered'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'خوارزميات متقدمة لتحسين تجربة التعلم'
                  : 'Advanced algorithms optimize your learning experience'
                }
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <Users className="w-12 h-12 text-accent mx-auto" />
              <h3 className="font-semibold">
                {language === 'ar' ? 'مجتمع نشط' : 'Active Community'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'تفاعل مع متعلمين آخرين وشارك تقدمك'
                  : 'Connect with other learners and share your progress'
                }
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <Target className="w-12 h-12 text-success mx-auto" />
              <h3 className="font-semibold">
                {language === 'ar' ? 'تقدم قابل للقياس' : 'Measurable Progress'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'تتبع دقيق لتقدمك وإنجازاتك'
                  : 'Detailed tracking of your progress and achievements'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card className="flashcard">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Send className="w-6 h-6 text-primary" />
            <span>{t('contactUs')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {language === 'ar' ? 'الاسم' : 'Name'}
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">
                {language === 'ar' ? 'الرسالة' : 'Message'}
              </Label>
              <Textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleInputChange}
                required
              />
            </div>
            <Button type="submit" className="luxury-button w-full">
              <Send className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إرسال الرسالة' : 'Send Message'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}