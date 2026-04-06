-- =============================================================================
-- Migration 05: Update BIMS classification type details for syncable types
-- =============================================================================
-- Replaces free-text fields on the 5 types that sync to eService beneficiaries
-- with structured amelioration_select / amelioration_multiselect fields so
-- BIMS staff pick actual social_amelioration_settings IDs — no name matching
-- needed at sync time.
-- =============================================================================

UPDATE public.classification_types
SET details = '[
  {"key":"pensionTypeIds","label":"Pension Types","type":"amelioration_multiselect","settingType":"PENSION_TYPE"},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb,
    updated_at = now()
WHERE name = 'Senior Citizen';

UPDATE public.classification_types
SET details = '[
  {"key":"disabilityTypeId","label":"Disability Type","type":"amelioration_select","settingType":"DISABILITY_TYPE"},
  {"key":"disabilityLevel","label":"Disability Level","type":"select","options":["MILD","MODERATE","SEVERE","PROFOUND"]},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb,
    updated_at = now()
WHERE name = 'Person with Disability';

UPDATE public.classification_types
SET details = '[
  {"key":"categoryId","label":"Category","type":"amelioration_select","settingType":"SOLO_PARENT_CATEGORY"},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb,
    updated_at = now()
WHERE name = 'Solo Parent';

UPDATE public.classification_types
SET details = '[
  {"key":"gradeLevelId","label":"Grade Level","type":"amelioration_select","settingType":"GRADE_LEVEL"},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb,
    updated_at = now()
WHERE name = 'Student';

UPDATE public.classification_types
SET details = '[
  {"key":"gradeLevelId","label":"Grade Level","type":"amelioration_select","settingType":"GRADE_LEVEL"},
  {"key":"course","label":"Course","type":"text"},
  {"key":"remarks","label":"Remarks","type":"text"}
]'::jsonb,
    updated_at = now()
WHERE name = 'College Student';
