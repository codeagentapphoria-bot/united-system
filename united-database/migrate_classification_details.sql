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
--
-- NOTE: The UPDATEs below intentionally target ALL municipalities.
--   classification_types.details defines the *field structure* (which inputs
--   to show), not resident data.  Every municipality must use the same
--   structure so the shared BIMS classification form renders correctly.
--   The WHERE clause explicitly joins municipalities to make this scope clear.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add amelioration_data column to registration_requests
-- -----------------------------------------------------------------------------
ALTER TABLE registration_requests
  ADD COLUMN IF NOT EXISTS amelioration_data JSONB NULL;

-- -----------------------------------------------------------------------------
-- 2. Update classification_types details for all municipalities
-- -----------------------------------------------------------------------------

-- Senior Citizen
UPDATE classification_types ct
SET details = '[{"key":"pensionTypes","label":"Pension / Benefit Types","type":"amelioration_multiselect","settingType":"PENSION_TYPE"},{"key":"remarks","label":"Remarks","type":"text"}]'::jsonb
WHERE ct.name = 'Senior Citizen'
  AND ct.municipality_id IN (SELECT id FROM municipalities);

-- Person with Disability
UPDATE classification_types ct
SET details = '[{"key":"disabilityType","label":"Type of Disability","type":"amelioration_select","settingType":"DISABILITY_TYPE"},{"key":"disabilityLevel","label":"Disability Level","type":"select","options":["Mild","Moderate","Severe"]},{"key":"remarks","label":"Remarks","type":"text"}]'::jsonb
WHERE ct.name = 'Person with Disability'
  AND ct.municipality_id IN (SELECT id FROM municipalities);

-- Student
UPDATE classification_types ct
SET details = '[{"key":"gradeLevel","label":"Grade / Education Level","type":"amelioration_select","settingType":"GRADE_LEVEL"},{"key":"remarks","label":"Remarks","type":"text"}]'::jsonb
WHERE ct.name = 'Student'
  AND ct.municipality_id IN (SELECT id FROM municipalities);

-- College Student
UPDATE classification_types ct
SET details = '[{"key":"courseField","label":"Course / Field of Study","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'::jsonb
WHERE ct.name = 'College Student'
  AND ct.municipality_id IN (SELECT id FROM municipalities);

-- Solo Parent
UPDATE classification_types ct
SET details = '[{"key":"category","label":"Solo Parent Category","type":"amelioration_select","settingType":"SOLO_PARENT_CATEGORY"},{"key":"remarks","label":"Remarks","type":"text"}]'::jsonb
WHERE ct.name = 'Solo Parent'
  AND ct.municipality_id IN (SELECT id FROM municipalities);
