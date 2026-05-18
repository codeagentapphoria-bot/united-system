-- =============================================================================
-- Migration 31: Backfill resident_classifications.classification_details
-- =============================================================================
-- For each beneficiary row, resolve FK → text via JOIN social_amelioration_settings
-- and write into resident_classifications.classification_details as the
-- field-key/text-value pairs that match the new details[] schema.
--
-- NOTE: resident_classifications.classification_type is a TEXT column holding
-- the type name directly (e.g. 'Person with Disability'), NOT a FK to
-- classification_types.id. The WHERE clause uses direct text equality.
--
-- Must run AFTER migration 30 and BEFORE migration 32.
-- Only writes where classification_details IS NULL OR classification_details = '{}'
-- to avoid overwriting existing curated data.
--
-- ROLLBACK:
--   UPDATE resident_classifications
--   SET classification_details = '{}'::jsonb
--   WHERE classification_details ?| array['disabilityType','gradeLevel','pensionTypes','category'];
-- =============================================================================

SET search_path TO public;

-- 1. PWD: disabilityType (latest record per resident by created_at)
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object('disabilityType', sas.name)
FROM (
  SELECT DISTINCT ON (pb.resident_id) pb.resident_id, pb.disability_type_id
  FROM pwd_beneficiaries pb
  WHERE pb.disability_type_id IS NOT NULL
  ORDER BY pb.resident_id, pb.created_at DESC
) latest
JOIN social_amelioration_settings sas
  ON sas.id::text = latest.disability_type_id::text
WHERE rc.resident_id = latest.resident_id
  AND rc.classification_type = 'Person with Disability'
  AND (rc.classification_details IS NULL OR rc.classification_details = '{}'::jsonb);

-- 2. Student: gradeLevel (latest record per resident)
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object('gradeLevel', sas.name)
FROM (
  SELECT DISTINCT ON (sb.resident_id) sb.resident_id, sb.grade_level_id
  FROM student_beneficiaries sb
  WHERE sb.grade_level_id IS NOT NULL
  ORDER BY sb.resident_id, sb.created_at DESC
) latest
JOIN social_amelioration_settings sas
  ON sas.id::text = latest.grade_level_id::text
WHERE rc.resident_id = latest.resident_id
  AND rc.classification_type = 'Student'
  AND (rc.classification_details IS NULL OR rc.classification_details = '{}'::jsonb);

-- 3. Senior Citizen: pensionTypes (aggregate array from pivot)
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object(
  'pensionTypes',
  COALESCE(agg.names, '[]'::jsonb)
)
FROM (
  SELECT
    scb.resident_id,
    jsonb_agg(DISTINCT sas.name ORDER BY sas.name) AS names
  FROM senior_citizen_beneficiaries scb
  JOIN senior_citizen_pension_type_pivots pivot ON pivot.beneficiary_id = scb.id
  JOIN social_amelioration_settings sas ON sas.id::text = pivot.setting_id::text
  WHERE sas.name IS NOT NULL
  GROUP BY scb.resident_id
) agg
WHERE rc.resident_id = agg.resident_id
  AND rc.classification_type = 'Senior Citizen'
  AND (rc.classification_details IS NULL OR rc.classification_details = '{}'::jsonb);

-- 4. Solo Parent: category (latest record per resident)
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object('category', sas.name)
FROM (
  SELECT DISTINCT ON (spb.resident_id) spb.resident_id, spb.category_id
  FROM solo_parent_beneficiaries spb
  WHERE spb.category_id IS NOT NULL
  ORDER BY spb.resident_id, spb.created_at DESC
) latest
JOIN social_amelioration_settings sas
  ON sas.id::text = latest.category_id::text
WHERE rc.resident_id = latest.resident_id
  AND rc.classification_type = 'Solo Parent'
  AND (rc.classification_details IS NULL OR rc.classification_details = '{}'::jsonb);

-- Verify
DO $$
DECLARE
    pwd_count INTEGER;
    student_count INTEGER;
    senior_count INTEGER;
    solo_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pwd_count FROM resident_classifications WHERE classification_details ? 'disabilityType';
    SELECT COUNT(*) INTO student_count FROM resident_classifications WHERE classification_details ? 'gradeLevel';
    SELECT COUNT(*) INTO senior_count FROM resident_classifications WHERE classification_details ? 'pensionTypes';
    SELECT COUNT(*) INTO solo_count FROM resident_classifications WHERE classification_details ? 'category';

    RAISE NOTICE 'Backfill complete: PWD=% Student=% Senior=% SoloParent=%',
        pwd_count, student_count, senior_count, solo_count;
END $$;
