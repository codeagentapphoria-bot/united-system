-- =============================================================================
-- Program Application Submission Data Migration
-- Adds submitted_data and attachments columns to government_program_applications.
-- Run this after migrate_government_programs_v2.sql.
-- =============================================================================

ALTER TABLE "government_program_applications"
  ADD COLUMN IF NOT EXISTS "submitted_data" JSONB,
  ADD COLUMN IF NOT EXISTS "attachments"    JSONB;
