-- =============================================================================
-- Migration 30: Backfill classification_types.details options from sas
-- =============================================================================
-- For each of the 4 amelioration classification types, aggregate distinct
-- social_amelioration_settings.name values (filtered by sas.type) into the
-- corresponding details[].options[] array, and convert the field type from
-- 'amelioration_select' / 'amelioration_multiselect' to 'select' / 'multiselect'.
--
-- PRECONDITION: classification_types.details holds the current
-- 'amelioration_select' / 'amelioration_multiselect' shape.
--
-- ROLLBACK: restore details JSONB from pre-migration DB snapshot.
-- =============================================================================

SET search_path TO public;

-- 1. Person with Disability — disabilityType (single select)
UPDATE classification_types
SET details = '[
  {"key":"disabilityType","label":"Type of Disability","type":"select","options":' ||
  (SELECT COALESCE(jsonb_agg(DISTINCT name ORDER BY name), '[]'::jsonb)::text
   FROM social_amelioration_settings
   WHERE type = 'DISABILITY_TYPE'
     AND is_active = true
     AND name IS NOT NULL
     AND length(trim(name)) > 0)
  || '},
  {"key":"disabilityLevel","label":"Disability Level","type":"select","options":["Mild","Moderate","Severe","Profound"]},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb
WHERE name = 'Person with Disability';

-- 2. Student — gradeLevel (single select)
UPDATE classification_types
SET details = '[
  {"key":"gradeLevel","label":"Grade / Education Level","type":"select","options":' ||
  (SELECT COALESCE(jsonb_agg(DISTINCT name ORDER BY name), '[]'::jsonb)::text
   FROM social_amelioration_settings
   WHERE type = 'GRADE_LEVEL'
     AND is_active = true
     AND name IS NOT NULL
     AND length(trim(name)) > 0)
  || '},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb
WHERE name = 'Student';

-- 3. Senior Citizen — pensionTypes (multiselect)
UPDATE classification_types
SET details = '[
  {"key":"pensionTypes","label":"Pension / Benefit Types","type":"multiselect","options":' ||
  (SELECT COALESCE(jsonb_agg(DISTINCT name ORDER BY name), '[]'::jsonb)::text
   FROM social_amelioration_settings
   WHERE type = 'PENSION_TYPE'
     AND is_active = true
     AND name IS NOT NULL
     AND length(trim(name)) > 0)
  || '},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb
WHERE name = 'Senior Citizen';

-- 4. Solo Parent — category (single select)
UPDATE classification_types
SET details = '[
  {"key":"category","label":"Solo Parent Category","type":"select","options":' ||
  (SELECT COALESCE(jsonb_agg(DISTINCT name ORDER BY name), '[]'::jsonb)::text
   FROM social_amelioration_settings
   WHERE type = 'SOLO_PARENT_CATEGORY'
     AND is_active = true
     AND name IS NOT NULL
     AND length(trim(name)) > 0)
  || '},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb
WHERE name = 'Solo Parent';

-- Verify
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Options counts after backfill:';
    FOR rec IN
      SELECT
        ct.name,
        (SELECT jsonb_array_length(field->'options')
         FROM jsonb_array_elements(ct.details) AS field
         WHERE field->>'type' IN ('select','multiselect')
         LIMIT 1) AS opt_count
      FROM classification_types ct
      WHERE ct.name IN ('Person with Disability','Student','Senior Citizen','Solo Parent')
    LOOP
      RAISE NOTICE '  - %: % options', rec.name, rec.opt_count;
    END LOOP;
END $$;
