-- =============================================================================
-- Migration 05: Add 'live_in' to residents.civil_status CHECK constraint
-- Ported from: barangay-information-management-system-copy/server/src/scripts/
--              migrations/2025-10-20-add-live-in-civil-status.js
-- IDEMPOTENT: safe to run multiple times
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'residents'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%live_in%'
  ) THEN
    BEGIN
      ALTER TABLE residents
        DROP CONSTRAINT IF EXISTS residents_civil_status_check,
        ADD CONSTRAINT residents_civil_status_check
        CHECK (civil_status IN ('single','married','widowed','separated','divorced','live_in'));
    EXCEPTION WHEN others THEN
      -- no-op: constraint may already exist with a different name
    END;
  END IF;
END$$;
