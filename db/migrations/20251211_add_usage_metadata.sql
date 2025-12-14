-- db/migrations/20251211_add_usage_metadata.sql
-- Forward migration for created_at/period/index/FK on user_api_usage and srs_data uniqueness.
BEGIN;

ALTER TABLE user_api_usage ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE user_api_usage ADD COLUMN IF NOT EXISTS period text DEFAULT to_char(now(), 'YYYY-MM');
CREATE INDEX IF NOT EXISTS idx_api_usage_user_period ON user_api_usage(user_id, period);
ALTER TABLE user_api_usage DROP CONSTRAINT IF EXISTS user_api_usage_user_id_fkey;
ALTER TABLE user_api_usage ADD CONSTRAINT user_api_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_srs_unique ON srs_data(user_id, card_id);

COMMIT;

-- To rollback, run db/migrations/20251211_drop_usage_metadata.sql
