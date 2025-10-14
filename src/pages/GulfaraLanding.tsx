import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, BookOpen, Users, Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function GulfaraLanding() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const navigate = useNavigate();

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const content = {
    en: {
      title: "Master Gulf Arabic with Gulfara",
      subtitle: "Learn through real-life scenarios and adaptive flashcards",
      description: "Experience personalized Arabic learning with AI-powered difficulty adjustment and spaced repetition.",
      features: [
        { icon: BookOpen, title: "Adaptive Learning", desc: "AI adjusts difficulty based on your progress" },
        { icon: Users, title: "Real Scenarios", desc: "Learn through practical Gulf Arabic situations" },
        { icon: Trophy, title: "Gamified Progress", desc: "Earn points, badges, and track your journey" },
        { icon: Sparkles, title: "Smart Repetition", desc: "Spaced repetition system for long-term retention" }
      ],
      cta: "Start Learning",
      demo: "Try Demo"
    },
    ar: {
      title: "أتقن اللهجة الخليجية مع غلفارا",
      subtitle: "تعلم من خلال سيناريوهات الحياة الحقيقية وبطاقات ذكية",
      description: "استمتع بتعلم العربية المخصص مع ضبط الذكاء الاصطناعي للصعوبة والتكرار المتباعد.",
      features: [
        { icon: BookOpen, title: "التعلم التكيفي", desc: "الذكاء الاصطناعي يضبط الصعوبة حسب تقدمك" },
        { icon: Users, title: "سيناريوهات حقيقية", desc: "تعلم من خلال مواقف عملية باللهجة الخليجية" },
        { icon: Trophy, title: "التقدم المبهر", desc: "اكسب النقاط والشارات وتتبع رحلتك" },
        { icon: Sparkles, title: "التكرار الذكي", desc: "نظام التكرار المتباعد للاحتفاظ طويل المدى" }
      ],
      cta: "ابدأ التعلم",
      demo: "جرب التجربة"
    }
  };

  const currentContent = content[language];

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Language Toggle */}
      <motion.button
        onClick={toggleLanguage}
        className="fixed top-6 right-6 z-50 flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg hover:bg-white transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Globe className="w-5 h-5 text-blue-600" />
        <span className="text-gray-700 font-medium">{language === 'en' ? 'عربي' : 'English'}</span>
      </motion.button>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6">
              {currentContent.title}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {currentContent.subtitle}
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
              {currentContent.description}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 text-lg font-semibold"
              onClick={() => navigate('/onboarding')}
            >
              {currentContent.cta}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold"
              onClick={() => navigate('/app')}
            >
              {currentContent.demo}
            </Button>
          </motion.div>

          {/* Demo Flashcard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-md mx-auto"
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
              <CardContent className="p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    {language === 'en' ? 'How are you?' : 'شلونك؟'}
                  </h3>
                  <p className="text-lg text-gray-600 mb-6">
                    {language === 'en' ? 'A common Gulf Arabic greeting' : 'تحية خليجية شائعة'}
                  </p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ duration: 2, delay: 1 }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">75% Mastery</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              {language === 'en' ? 'Why Choose Gulfara?' : 'لماذا تختار غلفارا؟'}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {language === 'en' 
                ? 'Experience the most advanced Arabic learning platform' 
                : 'اختبر منصة تعلم العربية الأكثر تطوراً'
              }
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {currentContent.features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <feature.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              {language === 'en' ? 'Ready to Start Your Journey?' : 'جاهز لبدء رحلتك؟'}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {language === 'en' 
                ? 'Join thousands of learners mastering Gulf Arabic' 
                : 'انضم إلى آلاف المتعلمين الذين يتقنون اللهجة الخليجية'
              }
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-12 py-4 text-xl font-semibold"
              onClick={() => navigate('/onboarding')}
            >
              {currentContent.cta}
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
