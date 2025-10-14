// src/Landing.tsx (adapted for Vite/React, removed Next.js specifics, optimized env access)
import { useState, FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Globe } from 'lucide-react';

// Initialize Supabase client using Vite env vars (lean: direct access, no fallback URLs)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Optimized async function: added validation, error handling; assume 'emails' table with RLS for anon inserts
async function storeEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { success: false, error: 'Invalid email format' };

  const { error } = await supabase.from('emails').insert([{ email }]);
  return error ? { success: false, error: error.message } : { success: true };
}

export default function Landing() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await storeEmail(email);
    setSubmitStatus(result.success ? 'success' : 'error');
    setSubmitError(result.success ? null : (result.error || 'Unknown error'));
    if (result.success) setEmail('');
    setIsSubmitting(false);
  };

  const feedbackLink = language === 'ar' ? 'https://forms.gle/4htSgY4JAKz3R2vk8' : 'https://forms.gle/DBNcwCBnaCbMfJKK8';
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const textAlign = language === 'ar' ? 'right' : 'left';

  return (
    <div dir={dir} className="min-h-screen flex flex-col items-center justify-center bg-white text-black p-4 font-sans" style={{ textAlign }}>
      <button
        onClick={toggleLanguage}
        className="fixed top-4 right-4 z-10 flex items-center space-x-2 bg-gray-200 px-3 py-1 rounded-full hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
      >
        <Globe className="w-5 h-5 text-gray-700" />
        <span className="text-gray-700">{language === 'en' ? 'عربي' : 'English'}</span>
      </button>

      <div
        className="w-80 h-48 perspective-1000 mb-8 cursor-pointer select-none"
        onClick={() => setIsFlipped(!isFlipped)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsFlipped(!isFlipped); }}
        tabIndex={0}
        role="button"
        aria-label="Flip card"
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          <div className="absolute w-full h-full backface-hidden bg-blue-600 text-white flex items-center justify-center rounded-lg shadow-lg p-4">
            <h2 className="text-2xl font-bold text-center">{language === 'en' ? 'How are you my dear?' : 'شلونك يا الغالي؟'}</h2>
          </div>
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-green-600 text-white flex flex-col items-center justify-center rounded-lg shadow-lg p-4">
            <h2 className="text-2xl font-bold text-center">{language === 'en' ? 'How are you my dear?' : 'كيف حالك يا عزيزي'}</h2>
            <p className="text-lg mt-2 text-center">How are you my dear?</p>
          </div>
        </div>
      </div>

      <section className="text-center mb-8 max-w-md">
        <h1 className="text-4xl font-bold mb-4">{language === 'en' ? 'Ready to Master Gulf Arabic?' : 'جاهز لإتقان اللهجة الخليجية؟'}</h1>
        <p className="text-lg mb-6">{language === 'en' ? 'Sign up for updates and early access.' : 'اشترك للحصول على التحديثات والوصول المبكر.'}</p>
        <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={language === 'en' ? 'Enter your email' : 'أدخل بريدك الإلكتروني'}
            className="px-4 py-2 border border-gray-300 rounded-md w-full text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            required
            aria-required="true"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {isSubmitting ? (language === 'en' ? 'Submitting...' : 'جاري الإرسال...') : (language === 'en' ? 'Submit' : 'إرسال')}
          </button>
        </form>
        {submitStatus === 'success' && <p className="mt-4 text-green-600 font-medium">{language === 'en' ? 'Email stored successfully!' : 'تم تخزين البريد بنجاح!'}</p>}
        {submitStatus === 'error' && <p className="mt-4 text-red-600 font-medium">{language === 'en' ? `Error: ${submitError || 'Try again.'}` : `خطأ: ${submitError || 'حاول مرة أخرى.'}`}</p>}
        <a href={feedbackLink} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 w-full text-center">
          {language === 'en' ? 'Contribute Feedback' : 'ساهم بردود الفعل'}
        </a>
      </section>

      <section className="text-center max-w-md">
        <h2 className="text-3xl font-bold mb-4">{language === 'en' ? 'Support Our Development' : 'دعم تطويرنا'}</h2>
        <p className="text-lg mb-6">{language === 'en' ? 'Help us build better tools for learning.' : 'ساعدنا في بناء أدوات أفضل للتعلم.'}</p>
        <a href="https://your-donation-link.com" target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
          {language === 'en' ? 'Donate Now' : 'تبرع الآن'}
        </a>
      </section>
    </div>
  );
}
