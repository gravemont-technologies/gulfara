-- Archived compatibility copy of supabase-schema.sql
-- Original preserved here for reference. Active schema is in `db/schema.sql`.

-- Copy of db/schema.sql (compatibility copy)
-- This file is provided for compatibility with documentation that references `supabase-schema.sql`.
-- Canonical source of truth is `db/schema.sql` (see `db/README.md`).

-- Copy starts here --

-- db/schema.sql
-- Canonical schema for Gulfara MVP (Postgres / Supabase)
-- Run with: psql -f db/schema.sql OR use Supabase SQL Editor

-- Enable uuid generation (Supabase usually has pgcrypto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- (truncated)
