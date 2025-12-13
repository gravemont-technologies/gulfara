-- inverse-schema.sql
-- Undo the changes appended to db/schema.sql (minimal, reversible rollback)
-- Run this file to remove the columns, indexes and constraint introduced by the schema patch.

BEGIN;

-- 1) Remove unique index on srs_data(user_id, card_id)
DROP INDEX IF EXISTS idx_srs_unique;

-- 2) Remove the FK constraint we added on user_api_usage (note: this will remove cascade behavior)
ALTER TABLE user_api_usage DROP CONSTRAINT IF EXISTS user_api_usage_user_id_fkey;

-- 3) Remove the index on user_api_usage(user_id, period)
DROP INDEX IF EXISTS idx_api_usage_user_period;

-- 4) Drop the period and created_at columns from user_api_usage
ALTER TABLE user_api_usage DROP COLUMN IF EXISTS period;
ALTER TABLE user_api_usage DROP COLUMN IF EXISTS created_at;

COMMIT;

-- Notes:
-- This file only removes things added by the schema patch. If you previously had a different FK on user_api_usage
-- and need to restore it, re-create that constraint after running this rollback.
