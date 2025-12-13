-- infra/seeds/schema.sql
-- Consolidated, executable schema derived from db/schema.sql + tracked migrations (20251211_add_usage_metadata.sql)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (Clerk-backed app user records)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE,
  email text UNIQUE,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Decks and flashcards
CREATE TABLE IF NOT EXISTS decks (
  id serial PRIMARY KEY,
  slug text UNIQUE,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id int REFERENCES decks(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  example text,
  hint text,
  audio_url text,
  created_at timestamptz DEFAULT now()
);

-- Spaced repetition rows per user/card
CREATE TABLE IF NOT EXISTS srs_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  card_id uuid REFERENCES cards(id) ON DELETE CASCADE,
  ease numeric DEFAULT 2.5,
  interval int DEFAULT 1,
  repetitions int DEFAULT 0,
  last_review timestamptz,
  next_review timestamptz,
  quality int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, card_id)
);

-- Progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  points bigint DEFAULT 0,
  level int DEFAULT 1,
  badges jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- API usage / cost per user (includes fields added via 20251211_add_usage_metadata)
CREATE TABLE IF NOT EXISTS user_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model text,
  tokens_used bigint DEFAULT 0,
  cost numeric DEFAULT 0,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  period text DEFAULT to_char(now(), 'YYYY-MM'),
  CONSTRAINT user_api_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Vouchers (basic rewards)
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  description text,
  points_cost int DEFAULT 0,
  redeemed_by uuid REFERENCES users(id),
  redeemed_at timestamptz
);

-- Indexes (core for edge functions and monthly queries)
CREATE INDEX IF NOT EXISTS idx_srs_user_next_review ON srs_data(user_id, next_review);
CREATE UNIQUE INDEX IF NOT EXISTS idx_srs_unique ON srs_data(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON user_api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_period ON user_api_usage(user_id, period);

-- Rollback helpers
-- Run db/inverse-schema.sql to drop the added columns/indexes/constraints if needed before reapplying migrations.

