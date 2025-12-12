-- Gulfara Database Schema
-- Supabase PostgreSQL schema for the Gulfara Arabic learning app

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Clerk user data)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  age_range TEXT CHECK (age_range IN ('18-25', '26-35', '36-45', '46-55', '55+')),
  occupation TEXT,
  learning_goals TEXT[],
  difficulty_level TEXT CHECK (difficulty_level IN ('A1', 'A2', 'B1', 'B2', 'C1')),
  preferred_categories TEXT[],
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0, -- in minutes
  average_accuracy DECIMAL(5,2) DEFAULT 0.00,
  coins INTEGER DEFAULT 1000,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcards table
CREATE TABLE flashcards (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  hint TEXT,
  example TEXT,
  audio_url TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seed_id TEXT,
  deck JSONB NOT NULL,
  categories TEXT[] NOT NULL,
  difficulty_level TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_decks_user_id ON user_decks(user_id);

-- User progress tracking (SRS data)
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES flashcards(id) ON DELETE CASCADE,
  ease DECIMAL(3,2) DEFAULT 2.50 CHECK (ease >= 1.30),
  interval INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  quality INTEGER CHECK (quality BETWEEN 0 AND 5),
  last_review TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mastery DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- Study sessions
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  session_type TEXT CHECK (session_type IN ('new', 'review', 'mixed')),
  cards_studied INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  incorrect_answers INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0, -- in seconds
  points_earned INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0.00,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session cards (many-to-many relationship)
CREATE TABLE session_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES flashcards(id) ON DELETE CASCADE,
  user_answer TEXT,
  correct BOOLEAN,
  time_spent INTEGER, -- in milliseconds
  difficulty_adjustment DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements and badges
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  points_required INTEGER,
  criteria JSONB, -- flexible criteria for unlocking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Vouchers and rewards
CREATE TABLE vouchers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User voucher claims
CREATE TABLE user_vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  voucher_id TEXT REFERENCES vouchers(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, voucher_id)
);

-- AI adaptation logs
CREATE TABLE ai_adaptations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES flashcards(id) ON DELETE CASCADE,
  previous_difficulty DECIMAL(3,2),
  new_difficulty DECIMAL(3,2),
  confidence DECIMAL(3,2),
  reasoning TEXT,
  performance_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email subscriptions (for landing page)
CREATE TABLE email_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_next_review ON user_progress(next_review);
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_started_at ON study_sessions(started_at);
CREATE INDEX idx_session_cards_session_id ON session_cards(session_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_vouchers_user_id ON user_vouchers(user_id);
CREATE INDEX idx_ai_adaptations_user_id ON ai_adaptations(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_adaptations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON profiles
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view own progress" ON user_progress
  FOR ALL USING (user_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can view own sessions" ON study_sessions
  FOR ALL USING (user_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can view own session cards" ON session_cards
  FOR ALL USING (session_id IN (
    SELECT id FROM study_sessions WHERE user_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  ));

CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR ALL USING (user_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can view own vouchers" ON user_vouchers
  FOR ALL USING (user_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can view own AI adaptations" ON ai_adaptations
  FOR ALL USING (user_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

-- Public read access for categories, flashcards, achievements, vouchers
CREATE POLICY "Public read access for categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Public read access for flashcards" ON flashcards
  FOR SELECT USING (true);

CREATE POLICY "Public read access for achievements" ON achievements
  FOR SELECT USING (true);

CREATE POLICY "Public read access for vouchers" ON vouchers
  FOR SELECT USING (is_active = true);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate user level based on points
CREATE OR REPLACE FUNCTION calculate_user_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(points / 500) + 1);
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats after study session
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_points INTEGER;
  user_level INTEGER;
  total_cards INTEGER;
  correct_cards INTEGER;
  accuracy DECIMAL(5,2);
BEGIN
  -- Get current user stats
  SELECT total_points INTO user_points
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Calculate new level
  user_level := calculate_user_level(user_points + NEW.points_earned);
  
  -- Calculate accuracy
  total_cards := NEW.cards_studied;
  correct_cards := NEW.correct_answers;
  accuracy := CASE 
    WHEN total_cards > 0 THEN (correct_cards::DECIMAL / total_cards) * 100
    ELSE 0
  END;
  
  -- Update user profile
  UPDATE profiles SET
    total_points = total_points + NEW.points_earned,
    level = user_level,
    total_study_time = total_study_time + NEW.time_spent,
    average_accuracy = CASE 
      WHEN average_accuracy = 0 THEN accuracy
      ELSE (average_accuracy + accuracy) / 2
    END,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user stats after study session
CREATE TRIGGER update_user_stats_trigger
  AFTER INSERT ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();
