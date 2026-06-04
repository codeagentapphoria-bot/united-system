-- =============================================================================
-- Migration 32: Strip beneficiary FK cols, pivots, and drop sas table
-- =============================================================================
-- IRREVERSIBLE. Developer MUST snapshot the database before running.
--
-- WHAT THIS DOES:
--   1. Drops the 4 *_beneficiary_programs pivot tables
--   2. Drops senior_citizen_pension_type_pivots
--   3. Drops the FK column from each of 4 beneficiary tables
--   4. Drops the social_amelioration_settings table
--   5. Government ID columns (pwd_id, student_id, senior_citizen_id, solo_parent_id)
--      are RETAINED.
--
-- PRECONDITION: migrations 30 and 31 must have completed successfully.
-- =============================================================================

SET search_path TO public;

-- 1. Drop pivot tables (order: pivots before parents)
DROP TABLE IF EXISTS pwd_beneficiary_programs CASCADE;
DROP TABLE IF EXISTS student_beneficiary_programs CASCADE;
DROP TABLE IF EXISTS senior_citizen_beneficiary_programs CASCADE;
DROP TABLE IF EXISTS solo_parent_beneficiary_programs CASCADE;
DROP TABLE IF EXISTS senior_citizen_pension_type_pivots CASCADE;

-- 2. Drop FK constraints (named explicitly per schema.sql)
ALTER TABLE pwd_beneficiaries DROP CONSTRAINT IF EXISTS pwd_disability_type_id_fkey;
ALTER TABLE student_beneficiaries DROP CONSTRAINT IF EXISTS student_grade_level_id_fkey;
ALTER TABLE solo_parent_beneficiaries DROP CONSTRAINT IF EXISTS sp_category_id_fkey;
-- Senior citizen had its FK in the pivot table (already dropped above).

-- 3. Drop FK columns from beneficiary tables
ALTER TABLE pwd_beneficiaries DROP COLUMN IF EXISTS disability_type_id;
ALTER TABLE student_beneficiaries DROP COLUMN IF EXISTS grade_level_id;
ALTER TABLE senior_citizen_beneficiaries DROP COLUMN IF EXISTS pension_type_id;
ALTER TABLE solo_parent_beneficiaries DROP COLUMN IF EXISTS category_id;

-- 4. Drop the social_amelioration_settings table
DROP TABLE IF EXISTS social_amelioration_settings CASCADE;

-- Verify
DO $$
DECLARE
    sas_exists BOOLEAN;
    pwd_fk_exists BOOLEAN;
    pivot_count INTEGER;
BEGIN
    SELECT EXISTS(
      SELECT FROM information_schema.tables
      WHERE table_name = 'social_amelioration_settings' AND table_schema = 'public'
    ) INTO sas_exists;

    SELECT EXISTS(
      SELECT FROM information_schema.columns
      WHERE table_name = 'pwd_beneficiaries'
        AND column_name = 'disability_type_id'
        AND table_schema = 'public'
    ) INTO pwd_fk_exists;

    SELECT COUNT(*) INTO pivot_count
    FROM information_schema.tables
    WHERE table_name IN (
      'pwd_beneficiary_programs','student_beneficiary_programs',
      'senior_citizen_beneficiary_programs','solo_parent_beneficiary_programs',
      'senior_citizen_pension_type_pivots'
    )
    AND table_schema = 'public';

    RAISE NOTICE 'social_amelioration_settings exists: %', sas_exists;
    RAISE NOTICE 'pwd_beneficiaries.disability_type_id exists: %', pwd_fk_exists;
    RAISE NOTICE 'Remaining pivot tables (expected 0): %', pivot_count;

    IF sas_exists THEN RAISE EXCEPTION 'Migration 32 failed: sas table still present'; END IF;
    IF pwd_fk_exists THEN RAISE EXCEPTION 'Migration 32 failed: FK col still present'; END IF;
    IF pivot_count > 0 THEN RAISE EXCEPTION 'Migration 32 failed: pivot tables remain'; END IF;
END $$;
