-- =============================================================================
-- backfill_classification_details.sql
--
-- One-time patch for residents approved before buildClassificationDetails was
-- fixed.  Updates resident_classifications.classification_details from the
-- amelioration_data stored in registration_requests — only for rows that are
-- currently empty ({} or []).
-- =============================================================================

-- Senior Citizen
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object(
  'pensionTypes', COALESCE(rr.amelioration_data->'seniorCitizen'->'pensionTypeIds', '[]'::jsonb),
  'remarks', ''
)
FROM registration_requests rr
WHERE rc.resident_id = rr.resident_fk
  AND rc.classification_type = 'Senior Citizen'
  AND rr.amelioration_data IS NOT NULL
  AND rr.amelioration_data ? 'seniorCitizen'
  AND rc.classification_details IN ('{}'::jsonb, '[]'::jsonb);

-- Person with Disability
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object(
  'disabilityType',  COALESCE(rr.amelioration_data->'pwd'->>'disabilityTypeId', ''),
  'disabilityLevel', COALESCE(rr.amelioration_data->'pwd'->>'disabilityLevel', ''),
  'remarks', ''
)
FROM registration_requests rr
WHERE rc.resident_id = rr.resident_fk
  AND rc.classification_type = 'Person with Disability'
  AND rr.amelioration_data IS NOT NULL
  AND rr.amelioration_data ? 'pwd'
  AND rc.classification_details IN ('{}'::jsonb, '[]'::jsonb);

-- Student (non-college)
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object(
  'gradeLevel', COALESCE(rr.amelioration_data->'student'->>'gradeLevelId', ''),
  'remarks', ''
)
FROM registration_requests rr
WHERE rc.resident_id = rr.resident_fk
  AND rc.classification_type = 'Student'
  AND rr.amelioration_data IS NOT NULL
  AND rr.amelioration_data ? 'student'
  AND rc.classification_details IN ('{}'::jsonb, '[]'::jsonb);

-- College Student
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object(
  'courseField', COALESCE(rr.amelioration_data->'student'->>'courseField', ''),
  'remarks', ''
)
FROM registration_requests rr
WHERE rc.resident_id = rr.resident_fk
  AND rc.classification_type = 'College Student'
  AND rr.amelioration_data IS NOT NULL
  AND rr.amelioration_data ? 'student'
  AND rc.classification_details IN ('{}'::jsonb, '[]'::jsonb);

-- Solo Parent
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object(
  'category', COALESCE(rr.amelioration_data->'soloParent'->>'categoryId', ''),
  'remarks', ''
)
FROM registration_requests rr
WHERE rc.resident_id = rr.resident_fk
  AND rc.classification_type = 'Solo Parent'
  AND rr.amelioration_data IS NOT NULL
  AND rr.amelioration_data ? 'soloParent'
  AND rc.classification_details IN ('{}'::jsonb, '[]'::jsonb);

-- Voter
UPDATE resident_classifications rc
SET classification_details = jsonb_build_object(
  'typeOfVoter', COALESCE(rr.amelioration_data->'voter'->>'voterType', 'Regular'),
  'remarks', ''
)
FROM registration_requests rr
WHERE rc.resident_id = rr.resident_fk
  AND rc.classification_type = 'Voter'
  AND rr.amelioration_data IS NOT NULL
  AND rr.amelioration_data ? 'voter'
  AND rc.classification_details IN ('{}'::jsonb, '[]'::jsonb);
