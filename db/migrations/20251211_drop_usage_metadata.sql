-- db/migrations/20251211_drop_usage_metadata.sql
-- Rollback for the usage metadata/migration above.
BEGIN;

ALTER TABLE user_api_usage DROP CONSTRAINT IF EXISTS user_api_usage_user_id_fkey;
DROP INDEX IF EXISTS idx_api_usage_user_period;
ALTER TABLE user_api_usage DROP COLUMN IF EXISTS period;
ALTER TABLE user_api_usage DROP COLUMN IF EXISTS created_at;
DROP INDEX IF EXISTS idx_srs_unique;

COMMIT;

-- Rerun 20251211_add_usage_metadata.sql to reapply.
