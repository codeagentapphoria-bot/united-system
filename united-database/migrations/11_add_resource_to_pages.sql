-- Migration: 11_add_resource_to_pages
-- NOTE: This migration is intentionally a no-op for FRESH DBs.
--
-- For EXISTING DBs that ran this before it was changed to a no-op:
--   - Adds the resource column (with broken backfill values)
--   - Migration 14 then fixes the values
--   - Migration 16 drops the column
--
-- For FRESH DBs (column doesn't exist yet):
--   - Skipped entirely — no column is created
--   - Migrations 14 and 16 safely become no-ops (column never existed)
--
-- This ensures fresh DBs never get the orphaned column at all, while
-- existing DBs get it cleaned up through migrations 14 → 16.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'resource') THEN
    RAISE NOTICE 'Migration 11: pages.resource column already exists — skipping creation (cleanup handled by migrations 14 and 16)';
  ELSE
    RAISE NOTICE 'Migration 11: pages.resource column not found — fresh DB, skipping entirely';
  END IF;
END $$;
