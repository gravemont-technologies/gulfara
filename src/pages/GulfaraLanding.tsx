import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const GulfaraLanding: React.FC = () => {
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Gulfara</h1>
          </div>
          <button
            onClick={toggleLanguage}
            className="px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {language === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            {language === 'en' ? 'Master Gulf Arabic' : 'أتقن اللهجة الخليجية'}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {language === 'en' 
              ? 'Learn Gulf Arabic through real-life scenarios with AI-powered adaptive flashcards'
              : 'تعلم اللهجة الخليجية من خلال سيناريوهات الحياة الواقعية مع البطاقات التكيفية المدعومة بالذكاء الاصطناعي'
            }
          </p>

          {/* Demo Flashcard */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 max-w-md mx-auto">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {language === 'en' ? 'Try a flashcard' : 'جرب بطاقة تعليمية'}
              </h3>
              <div className="bg-blue-50 rounded-lg p-6 mb-4">
                <p className="text-2xl font-bold text-blue-800 mb-2">مرحبا</p>
                <p className="text-gray-600">Hello / Hi</p>
              </div>
              <p className="text-sm text-gray-500">
                {language === 'en' ? 'Tap to flip and see more examples' : 'اضغط للقلب ورؤية المزيد من الأمثلة'}
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-4">
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
            >
              {language === 'en' ? 'Start Learning Free' : 'ابدأ التعلم مجاناً'}
            </button>
            <p className="text-sm text-gray-500">
              {language === 'en' ? 'No credit card required' : 'لا يتطلب بطاقة ائتمان'}
            </p>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {language === 'en' ? 'Why Gulfara?' : 'لماذا خليفارا؟'}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {language === 'en' ? 'AI-Powered' : 'مدعوم بالذكاء الاصطناعي'}
              </h3>
              <p className="text-gray-600">
                {language === 'en' 
                  ? 'Adapts to your learning pace and difficulty'
                  : 'يتكيف مع وتيرة التعلم وصعوبتك'
                }
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {language === 'en' ? 'Real Scenarios' : 'سيناريوهات حقيقية'}
              </h3>
              <p className="text-gray-600">
                {language === 'en' 
                  ? 'Learn through practical, everyday situations'
                  : 'تعلم من خلال المواقف العملية اليومية'
                }
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {language === 'en' ? 'Gamified' : 'مبني على الألعاب'}
              </h3>
              <p className="text-gray-600">
                {language === 'en' 
                  ? 'Earn points, badges, and rewards as you learn'
                  : 'اكسب النقاط والشارات والمكافآت أثناء التعلم'
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 mb-4">
            {language === 'en' ? 'Ready to start your Gulf Arabic journey?' : 'مستعد لبدء رحلتك في تعلم اللهجة الخليجية؟'}
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {language === 'en' ? 'Get Started Now' : 'ابدأ الآن'}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default GulfaraLanding;