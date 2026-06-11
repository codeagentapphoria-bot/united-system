-- Migration: 36_add_healthcare_worker_beneficiary_type
-- Adds HEALTHCARE_WORKER to beneficiary_type and government_program_type enums
-- Date: 2026-06-11

-- Step 1: Add HEALTHCARE_WORKER to beneficiary_type enum
ALTER TYPE public.beneficiary_type ADD VALUE 'HEALTHCARE_WORKER';

-- Step 2: Add HEALTHCARE_WORKER to government_program_type enum
ALTER TYPE public.government_program_type ADD VALUE 'HEALTHCARE_WORKER';

-- Verify the changes
DO $$
BEGIN
  -- Check beneficiary_type has the new value
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'HEALTHCARE_WORKER'
      AND enumtypid = 'public.beneficiary_type'::regtype
  ) THEN
    RAISE EXCEPTION 'beneficiary_type enum not updated correctly';
  END IF;

  -- Check government_program_type has the new value
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'HEALTHCARE_WORKER'
      AND enumtypid = 'public.government_program_type'::regtype
  ) THEN
    RAISE EXCEPTION 'government_program_type enum not updated correctly';
  END IF;

  RAISE NOTICE 'Both enums updated successfully';
END $$;

-- Rollback
-- PostgreSQL does not support removing enum values with a simple statement.
-- To rollback, recreate the types without HEALTHCARE_WORKER:
--
-- Step 1: Backup any data that uses HEALTHCARE_WORKER
-- SELECT COUNT(*) FROM public.beneficiary_program_pivots WHERE beneficiary_type = 'HEALTHCARE_WORKER';
-- SELECT COUNT(*) FROM public.government_programs WHERE 'HEALTHCARE_WORKER' = ANY(types);
--
-- Step 2: Recreate beneficiary_type without HEALTHCARE_WORKER
-- ALTER TYPE public.beneficiary_type RENAME TO beneficiary_type_old;
-- CREATE TYPE public.beneficiary_type AS ENUM ('SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT');
-- ALTER TABLE beneficiary_program_pivots ALTER COLUMN beneficiary_type TYPE public.beneficiary_type
--   USING (CASE WHEN beneficiary_type::text = 'HEALTHCARE_WORKER' THEN NULL ELSE beneficiary_type::public.beneficiary_type END);
-- DROP TYPE public.beneficiary_type_old;
--
-- Step 3: Recreate government_program_type without HEALTHCARE_WORKER
-- ALTER TYPE public.government_program_type RENAME TO government_program_type_old;
-- CREATE TYPE public.government_program_type AS ENUM ('SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL');
-- ALTER TABLE government_programs ALTER COLUMN types TYPE public.government_program_type[]
--   USING (array_remove(array_replace(types, 'HEALTHCARE_WORKER'::public.government_program_type, NULL::public.government_program_type), NULL));
-- DROP TYPE public.government_program_type_old;
