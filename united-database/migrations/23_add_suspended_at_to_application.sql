-- Migration: 23_add_suspended_at_and_status_to_beneficiary_program_pivot
-- Adds enrollment tracking to beneficiary_program_pivots for per-program
-- active/suspended status. This replaces the prior approach of setting
-- category tables to INACTIVE.

-- Enrollment status on the pivot (per-program, per-beneficiary)
ALTER TABLE "beneficiary_program_pivots"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- Suspension timestamp for tracking when a beneficiary was suspended
ALTER TABLE "beneficiary_program_pivots"
  ADD COLUMN "suspended_at" TIMESTAMPTZ;
