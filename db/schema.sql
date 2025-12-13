-- db/schema.sql
-- Canonical schema for Gulfara MVP (Postgres / Supabase)
-- Run with: psql -f db/schema.sql OR use Supabase SQL Editor

-- Enable uuid generation (Supabase usually has pgcrypto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (stores app user references; Clerk ID stored for mapping)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE,
  email text UNIQUE,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Decks (collections of cards)
CREATE TABLE IF NOT EXISTS decks (
  id serial PRIMARY KEY,
  slug text UNIQUE,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Cards (flashcards)
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

-- Spaced Repetition data per user/card
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

-- User progress & points
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

-- API usage / cost tracking per user
CREATE TABLE IF NOT EXISTS user_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  model text,
  tokens_used bigint DEFAULT 0,
  cost numeric DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

-- Voucher claims (basic)
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  description text,
  points_cost int DEFAULT 0,
  redeemed_by uuid REFERENCES users(id),
  redeemed_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_srs_user_next_review ON srs_data(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON user_api_usage(user_id);

-- Notes: Add Row Level Security (RLS) policies in Supabase console.
-- Example policy (Supabase SQL editor) for srs_data:
-- ALTER TABLE srs_data ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "users can access own srs" ON srs_data USING (user_id = auth.uid());

-- === Minimal, backwards-compatible production fixes ===
-- 1) Add reliable timestamps used by edge functions and a period column for fast monthly queries
ALTER TABLE user_api_usage ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
-- Use now() in default because Postgres does not allow referencing other columns
-- in a DEFAULT expression. This keeps behavior equivalent when created_at
-- is not explicitly provided. If you need period derived from an explicit
-- created_at value, consider a GENERATED column or a trigger.
ALTER TABLE user_api_usage ADD COLUMN IF NOT EXISTS period text DEFAULT to_char(now(), 'YYYY-MM');
CREATE INDEX IF NOT EXISTS idx_api_usage_user_period ON user_api_usage(user_id, period);

-- 2) Ensure user_api_usage is cleaned up when a user is removed (avoid orphans)
ALTER TABLE user_api_usage DROP CONSTRAINT IF EXISTS user_api_usage_user_id_fkey;
ALTER TABLE user_api_usage ADD CONSTRAINT user_api_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3) Make srs_data uniqueness explicit and indexed (edge functions upsert on user_id,card_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_srs_unique ON srs_data(user_id, card_id);

-- Rollback notes:
-- To rollback created_at/period/index: DROP INDEX idx_api_usage_user_period; ALTER TABLE user_api_usage DROP COLUMN period; ALTER TABLE user_api_usage DROP COLUMN created_at;
-- To rollback FK change: ALTER TABLE user_api_usage DROP CONSTRAINT user_api_usage_user_id_fkey; -- then recreate prior FK as needed
-- To rollback srs unique index: DROP INDEX IF EXISTS idx_srs_unique;
