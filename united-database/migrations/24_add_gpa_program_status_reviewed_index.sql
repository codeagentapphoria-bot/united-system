-- Add composite index for GovernmentProgramApplication listBeneficiaries query
-- Covers: WHERE program_id = ? AND status = ? ORDER BY reviewed_at DESC NULLS LAST
CREATE INDEX IF NOT EXISTS "idx_gpa_program_status_reviewed"
ON "government_program_applications" ("program_id", "status", "reviewed_at" DESC NULLS LAST);
