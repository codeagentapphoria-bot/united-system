-- =============================================================================
-- migrate_classification_details.sql
--
-- 1. Add amelioration_data JSONB column to registration_requests
--    Stores social amelioration sub-field values submitted by the resident
--    during self-registration. Used on approval to hydrate beneficiary tables.
--
-- 2. Update classification_types details for the 4 social amelioration types
--    so the BIMS classification dialog renders the correct dropdowns linked
--    to social_amelioration_settings instead of plain text fields.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add amelioration_data column to registration_requests
-- -----------------------------------------------------------------------------
ALTER TABLE registration_requests
  ADD COLUMN IF NOT EXISTS amelioration_data JSONB NULL;

-- -----------------------------------------------------------------------------
-- 2. Update classification_types details for the 4 overlapping types
--    Uses ON CONFLICT to upsert so the migration is safe to re-run.
-- -----------------------------------------------------------------------------

-- Senior Citizen
UPDATE classification_types
SET details = '[
  {"key":"pensionTypes","label":"Pension / Benefit Types","type":"amelioration_multiselect","settingType":"PENSION_TYPE"},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb
WHERE name = 'Senior Citizen';

-- Person with Disability
UPDATE classification_types
SET details = '[
  {"key":"disabilityType","label":"Type of Disability","type":"amelioration_select","settingType":"DISABILITY_TYPE"},
  {"key":"disabilityLevel","label":"Disability Level","type":"select","options":["Mild","Moderate","Severe"]},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb
WHERE name = 'Person with Disability';

-- Student
UPDATE classification_types
SET details = '[
  {"key":"gradeLevel","label":"Grade / Education Level","type":"amelioration_select","settingType":"GRADE_LEVEL"},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb
WHERE name = 'Student';

-- College Student (also maps to student_beneficiaries)
-- Course/field of study is more meaningful than grade level for college students
UPDATE classification_types
SET details = '[{"key":"courseField","label":"Course / Field of Study","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'::jsonb
WHERE name = 'College Student';

-- Solo Parent
UPDATE classification_types
SET details = '[
  {"key":"category","label":"Solo Parent Category","type":"amelioration_select","settingType":"SOLO_PARENT_CATEGORY"},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb
WHERE name = 'Solo Parent';
