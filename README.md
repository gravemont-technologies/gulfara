# Gulfara - Adaptive Gulf Arabic Flashcards

A production-grade, AI-powered flashcard application for learning Gulf Arabic through real-life scenarios. Built with modern React, TypeScript, and cutting-edge technologies.

## 🌟 Features

### Core Learning Features
- **Adaptive Difficulty**: AI-powered difficulty adjustment based on user performance
- **Spaced Repetition**: SM-2 algorithm for optimal learning intervals
- **Real-life Scenarios**: Learn through practical Gulf Arabic situations
- **Multi-category Learning**: Family, work, travel, food, shopping, health, education, social
- **Audio Support**: Pronunciation guides for authentic learning

### Gamification & Progress
- **Points System**: Earn points for correct answers and streaks
- **Achievement Badges**: Unlock badges for milestones
- **Reward Vouchers**: Claim real-world rewards with points
- **Progress Tracking**: Detailed analytics and learning statistics
- **Streak System**: Daily learning streaks with bonuses

### Technical Features
- **Modern Stack**: React 18, TypeScript, Vite, TailwindCSS
- **Authentication**: Clerk integration for secure user management
- **Database**: Supabase with PostgreSQL and real-time features
- **AI Integration**: Vercel AI SDK for adaptive learning
- **Responsive Design**: Mobile-first, Apple-inspired UI
- **Performance**: Optimized for LCP ≤2.2s, CLS ≤0.02

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Clerk account
- Vercel AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gulfara
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp backend.env backend.env   # keep backend.env for server-side secrets
   cp env .env                  # use .env for frontend publishables
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Clerk Authentication
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   
   # Vercel AI SDK
   VITE_VERCEL_AI_API_KEY=your_vercel_ai_api_key
   
   # App Configuration (in .env)
   VITE_APP_BASE_URL=http://localhost:5173
   ```

4. **Database Setup**
   - Create a new Supabase project
   - Run the SQL schema from `supabase-schema.sql`
   - Import the flashcard data from `src/content/flashcards.json`

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

### Frontend Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/              # Base UI components (Radix UI)
│   └── GulfaraFlashcard.tsx
├── pages/               # Route components
│   ├── GulfaraLanding.tsx
│   ├── Onboarding.tsx
│   ├── Dashboard.tsx
│   ├── Practice.tsx
│   ├── Profile.tsx
│   └── Rewards.tsx
├── services/            # Business logic
│   ├── aiAdapter.ts     # AI difficulty adaptation
│   └── srsEngine.ts     # Spaced repetition system
├── contexts/            # React contexts
├── content/             # Static content and data
└── lib/                 # Utilities and helpers
```

### Backend Schema
- **Profiles**: User data and preferences
- **Flashcards**: Learning content with categories
- **User Progress**: SRS data and mastery tracking
- **Study Sessions**: Learning analytics
- **Achievements**: Gamification system
- **Vouchers**: Reward system

## 🧠 AI-Powered Learning

### Adaptive Difficulty System
The AI adapter analyzes user performance and adjusts card difficulty:

```typescript
interface UserPerformance {
  userId: string;
  lastResult: boolean;
  avgScore: number;
  targetDifficulty: number;
  recentAnswers: Array<{
    correct: boolean;
    timeSpent: number;
    difficulty: number;
  }>;
}
```

### Spaced Repetition (SM-2 Algorithm)
Implements the proven SuperMemo SM-2 algorithm:

```typescript
interface SRSData {
  cardId: string;
  userId: string;
  ease: number;        // Ease factor (1.3-5.0)
  interval: number;    // Days until next review
  repetitions: number; // Successful repetitions
  lastReview: Date;
  nextReview: Date;
  quality: number;     // Answer quality (0-5)
}
```

## 🎨 Design System

### Color Palette
- **Primary**: #0a6cff (Gulf Blue)
- **Accent**: #00c5a6 (Cyan)
- **Text**: #0b1220 (Dark Blue)
- **Background**: #ffffff (White)

### Typography
- **Font**: Inter (primary), fallback sans-serif
- **Arabic Support**: Proper RTL layout and Arabic fonts

### Components
- **Cards**: Apple-inspired with subtle shadows
- **Animations**: Framer Motion for smooth transitions
- **Responsive**: Mobile-first design approach

## 📊 Analytics & Progress

### Learning Metrics
- **Mastery Level**: Percentage of cards mastered
- **Retention Rate**: Long-term memory retention
- **Study Time**: Total and average study time
- **Accuracy**: Overall and category-specific accuracy
- **Streak**: Daily learning consistency

### Visualizations
- **Progress Charts**: Weekly activity and accuracy trends
- **Category Mastery**: Visual progress bars for each category
- **Achievement Timeline**: Unlocked badges and milestones

## 🔧 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
```

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting and best practices
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_CLERK_PUBLISHABLE_KEY=your_production_clerk_key
CLERK_SECRET_KEY=your_production_clerk_secret
VITE_VERCEL_AI_API_KEY=your_vercel_ai_api_key
VITE_APP_BASE_URL=https://your-domain.vercel.app
```

## 📱 Mobile Support

- **Responsive Design**: Works on all screen sizes
- **Touch Gestures**: Swipe and tap interactions
- **PWA Ready**: Can be installed as a mobile app
- **Offline Support**: Basic offline functionality

## 🔒 Security

- **Authentication**: Secure Clerk integration
- **Row Level Security**: Supabase RLS policies
- **Data Validation**: TypeScript and runtime validation
- **HTTPS Only**: Secure connections in production

## 📈 Performance

### Optimization Targets
- **LCP**: ≤2.2 seconds
- **CLS**: ≤0.02
- **Bundle Size**: <150KB initial load
- **TTI**: ≤3.5 seconds

### Techniques Used
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: WebP format with fallbacks
- **Caching**: Aggressive caching strategies
- **Bundle Analysis**: Regular bundle size monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Supabase**: Backend and database
- **Clerk**: Authentication system
- **Vercel AI**: AI integration
- **Radix UI**: Accessible components
- **Framer Motion**: Animations
- **TailwindCSS**: Styling framework

## 📞 Support

For support, email support@gulfara.com or join our Discord community.

---

**Gulfara** - Master Gulf Arabic with AI-powered adaptive learning 🚀
