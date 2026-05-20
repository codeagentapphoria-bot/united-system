-- =============================================================================
-- Migration 33: Vocational Student classification type + NC Level options
-- =============================================================================
-- WHAT THIS DOES:
--   1. Updates 'Student' classification_type details — fixes field keys and
--      hardcodes gradeLevel options (excluding vocational/technical).
--   2. Updates 'College Student' classification_type details — aligns field keys
--      to match what the application code uses (courseField, gradeLevel).
--   3. Inserts new 'Vocational Student' classification_type with ncLevel
--      dropdown + courseField text.
--
-- PREREQUISITES:
--   - Migration 32 (drop SAS table) must have already run.
--   - At least one municipality must exist.
--
-- ROLLBACK:
--   Restore 'Student' and 'College Student' details from a pre-migration backup.
--   DELETE FROM classification_types WHERE name = 'Vocational Student';
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- 1. Student — fix details to hardcoded gradeLevel options (no vocational).
--    Excludes any SAS-driven options that were picked up by migration 30.
-- =============================================================================

UPDATE classification_types
SET details = (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'key',   'gradeLevel',
      'label', 'Grade / Education Level',
      'type',  'select',
      'options', jsonb_build_array(
        'Elementary (Grade 1–6)',
        'Junior High School (Grade 7–10)',
        'Senior High School (Grade 11–12)'
      )
    ),
    jsonb_build_object(
      'key',   'remarks',
      'label', 'Remarks',
      'type',  'text'
    )
  )
)
WHERE name = 'Student';

-- =============================================================================
-- 2. College Student — fix field keys and add gradeLevel dropdown.
--    The old seed had 'course' and 'collegeLevel' (unused). Code uses
--    'courseField' and 'gradeLevel'. Align here.
-- =============================================================================

UPDATE classification_types
SET details = (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'key',   'gradeLevel',
      'label', 'Year Level',
      'type',  'select',
      'options', jsonb_build_array(
        '1st Year',
        '2nd Year',
        '3rd Year',
        '4th Year',
        '5th Year',
        '6th Year',
        'Graduate'
      )
    ),
    jsonb_build_object(
      'key',   'courseField',
      'label', 'Course / Program',
      'type',  'text'
    ),
    jsonb_build_object(
      'key',   'remarks',
      'label', 'Remarks',
      'type',  'text'
    )
  )
)
WHERE name = 'College Student';

-- =============================================================================
-- 3. Vocational Student — new classification type.
--    TESDA NTVQF qualifications: NC I through NC VI, plus Diploma/Bachelor/Master.
-- =============================================================================

INSERT INTO classification_types (municipality_id, name, description, color, details, is_active, created_at, updated_at)
SELECT
  m.id,
  'Vocational Student'::text,
  'Students enrolled in TESDA-registered vocational or technical courses'::text,
  '#9C27B0'::text,
  (
    SELECT jsonb_build_array(
      jsonb_build_object(
        'key',   'ncLevel',
        'label', 'NC Level / Qualification',
        'type',  'select',
        'options', jsonb_build_array(
          'NC I',
          'NC II',
          'NC III',
          'NC IV',
          'NC V',
          'NC VI',
          'Diploma',
          'Bachelor',
          'Master',
          'Doctorate'
        )
      ),
      jsonb_build_object(
        'key',   'courseField',
        'label', 'Course / Program',
        'type',  'text'
      ),
      jsonb_build_object(
        'key',   'remarks',
        'label', 'Remarks',
        'type',  'text'
      )
    )
  ),
  true,
  NOW(),
  NOW()
FROM municipalities m
ON CONFLICT (municipality_id, name) DO NOTHING;

-- =============================================================================
-- Verify
-- =============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Classification types after migration 33:';
  FOR rec IN
    SELECT
      ct.name,
      (ct.details->0->>'key')           AS field1_key,
      (ct.details->0->>'type')          AS field1_type,
      jsonb_array_length(ct.details->0->'options') AS field1_opt_count,
      (ct.details->1->>'key')           AS field2_key,
      (ct.details->1->>'type')           AS field2_type,
      (ct.details->2->>'key')           AS field3_key,
      (ct.details->2->>'type')          AS field3_type
    FROM classification_types ct
    WHERE ct.name IN ('Student', 'College Student', 'Vocational Student')
    ORDER BY ct.name
  LOOP
    RAISE NOTICE '  - %: field1=[% % % opts] field2=[%] field3=[%]',
      rec.name, rec.field1_key, rec.field1_type, rec.field1_opt_count, rec.field2_key, rec.field3_key;
  END LOOP;
END $$;
