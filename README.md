# Gulfara - Adaptive Gulf Arabic Flashcards

An AI-powered flashcard application for Gulf Arabic, now back-ended by Firebase/Firestore. The prior Supabase documentation and edge functions have been archived under `archive/supabase-migration/` for reference.

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
- **Database**: Firebase Firestore (Supabase artifacts archived in `archive/supabase-migration/`)
- **AI Integration**: Vercel AI SDK for adaptive learning
- **Responsive Design**: Mobile-first, Apple-inspired UI
- **Performance**: Optimized for LCP ≤2.2s, CLS ≤0.02

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Environment Setup

1. **Quick setup (recommended)** – run `setup-env.bat` on Windows or `chmod +x setup-env.sh && ./setup-env.sh` on macOS/Linux to bootstrap `.env` from the template so you can focus on filling secrets.
2. **Manual setup** – copy the template yourself if you prefer:
  ```bash
  cp env.template .env
  ```
3. **Frontend `.env`** – only publishable/browser-safe values belong here:
  ```env
  NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
  NEXT_PUBLIC_USE_FIREBASE=true
  NEXT_PUBLIC_DUAL_WRITE_MODE=false
  VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
  VITE_USE_EDGE_REVIEW=true
  VITE_USE_EDGE_AI_PROXY=true
  VITE_APP_BASE_URL=http://localhost:5200
  VITE_APP_BASE_PATH=/
  ```
4. **Single `.env` for local dev** – this repository uses one local `.env` file that contains both public and server-only values for local development. Keep `.env` gitignored and use a secure vault for production secrets. Example server/private fields to add to `.env`:
  ```env
  FIREBASE_ADMIN_PROJECT_ID=your_project_id
  FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
  FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
  CLERK_JWKS_URL=https://clerk.static-accounts.com/jwks
  CLERK_API_KEY=optional_clerk_api_key_when_using_server_sdk
  OPENAI_API_KEY=your_openai_api_key
  OPENAI_USER_MONTHLY_CAP=1000
  ```
5. **Preflight validation** – once secrets are configured, verify readiness and lint/build health:
  ```bash
  npm run env:status   # confirms Firebase/Clerk/OpenAI flags
  npm run preflight    # lint + build + env readiness
  ```

### Database Setup
- Firestore rules live in `firestore.rules`, indexes in `firestore.indexes.json`, and can be deployed via `npx firebase deploy --only firestore:rules,firestore:indexes`.
- Configure the `gulfara-cards` Firebase project (Auth + Firestore) in the Firebase Console and manage the admin credentials in a vault.
- During local development, run `npx firebase emulators:start --only firestore,auth` and point `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` at the emulator ports to keep tests isolated.
- Import the flashcard data from `src/content/flashcards.json` into Firestore or use the emulator suite to seed the collections.

### Start Development Server
```bash
npm run dev
```

## ✅ Testing

Run the suites individually or through the CI bundle:

- **Unit tests (Vitest):** `npm run test:unit`
- **Integration tests (React flows, Supabase/Clerk mocks):** `npm run test:integration`
- **API/contract tests (/api/sync):** `npm run test:api`
- **Smoke tests (Playwright chromium only):** `npm run test:smoke`
- **Full end-to-end matrix:** `npm run test:e2e`
- **CI sequence (lint + all critical suites):** `npm run test:ci`

Artifacts are emitted to `.test-reports/`:

- Coverage: `.test-reports/coverage`
- Playwright traces/report: `.test-reports/playwright` & `.test-reports/playwright-report`

> Tip: run `npm run playwright:install` once per machine to download the required browsers.

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
2. Set the frontend environment variables listed above inside Vercel and configure private secrets in your secret manager or populate them in the local `.env` for development.
3. Deploy automatically on push to `main`.
4. After Vercel builds, run the Supabase commands to deploy the Edge functions:
  ```bash
  supabase functions deploy review --project <your-project-ref>
  supabase functions deploy ai-proxy --project <your-project-ref>
  ```

### Environment Variables for Production
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_CLERK_PUBLISHABLE_KEY=your_production_clerk_key
VITE_USE_EDGE_REVIEW=true
VITE_USE_EDGE_AI_PROXY=true
VITE_APP_BASE_URL=https://your-domain.vercel.app
```

Backend secrets (set via Supabase CLI or directly in the Supabase dashboard):
```env
SUPABASE_URL=https://your-production-instance.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLERK_JWKS_URL=https://clerk.static-accounts.com/jwks
OPENAI_API_KEY=your_production_openai_key
OPENAI_USER_MONTHLY_CAP=1000
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
