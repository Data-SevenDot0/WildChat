-- PostgREST compatibility helper for WildChat
-- Adds a surrogate primary key where needed, creates a PostgREST role, and grants privileges.

BEGIN;

-- Add a BIGSERIAL primary key to country_daily_metrics if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='wildchat' AND table_name='country_daily_metrics' AND column_name='id'
  ) THEN
    ALTER TABLE wildchat.country_daily_metrics ADD COLUMN id BIGSERIAL PRIMARY KEY;
  END IF;
END$$;

-- Create a dedicated PostgREST role (change the password before production)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgrest') THEN
    CREATE ROLE postgrest NOINHERIT LOGIN PASSWORD 'change_me';
  END IF;
END$$;

-- Grant access to the schema and tables
GRANT USAGE ON SCHEMA wildchat TO postgrest;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA wildchat TO postgrest;
ALTER DEFAULT PRIVILEGES IN SCHEMA wildchat GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO postgrest;

COMMIT;

-- Notes:
-- - Replace the 'change_me' password with a secure password and update PostgREST's db-uri.
-- - PostgREST prefers tables with primary keys for PATCH/DELETE operations; this script adds
--   a surrogate 'id' for country_daily_metrics if missing.
-- - For row-level security or fine-grained policies, create policies for the 'postgrest' role.
