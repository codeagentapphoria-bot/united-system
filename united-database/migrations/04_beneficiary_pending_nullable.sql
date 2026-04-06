-- =============================================================================
-- Migration 04: Allow PENDING beneficiary records with null FK fields
-- =============================================================================
-- When BIMS assigns a resident classification (Senior Citizen, PWD, Student,
-- Solo Parent), the BIMS backend auto-creates a PENDING beneficiary stub in the
-- corresponding table. The required FK fields (disability_type_id, grade_level_id,
-- category_id) are not yet known at classification time — eService admins complete
-- these via the Social Amelioration page before activating the record.
-- =============================================================================

-- pwd_beneficiaries: disability_type_id and disability_level not yet known
ALTER TABLE public.pwd_beneficiaries ALTER COLUMN disability_type_id DROP NOT NULL;
ALTER TABLE public.pwd_beneficiaries ALTER COLUMN disability_level    DROP NOT NULL;

-- student_beneficiaries: grade_level_id not yet known
ALTER TABLE public.student_beneficiaries ALTER COLUMN grade_level_id DROP NOT NULL;

-- solo_parent_beneficiaries: category_id not yet known
ALTER TABLE public.solo_parent_beneficiaries ALTER COLUMN category_id DROP NOT NULL;
