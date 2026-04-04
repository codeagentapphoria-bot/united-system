-- =============================================================================
-- Migration 06: Add full_name column to requests table
-- Ported from: barangay-information-management-system-copy/server/src/scripts/
--              migrations/2026-03-28-add-requests-full-name.js
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS is safe to run multiple times
-- =============================================================================

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(200);
