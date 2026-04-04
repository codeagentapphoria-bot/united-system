// =============================================================================
// RESIDENT QUERIES — Updated for Unified Schema v2
//
// KEY SCHEMA CHANGES:
//   - residents.id is now UUID text (not custom varchar)
//   - residents.resident_id is the human-readable display ID (BIMS-YYYY-NNNNNNN)
//   - residents.status (was resident_status)
//   - residents.extension_name (was extension_name)
//   - residents.street_address (new — replaces household street at person level)
//   - No more puroks table
//   - No more INSERT_RESIDENT / UPDATE_RESIDENT (residents created via portal only)
// =============================================================================

// =============================================================================
// READ: Full resident profile
// =============================================================================

export const VIEW_RESIDENT_INFORMATION = `
SELECT
  r.id,
  r.resident_id,
  r.barangay_id,
  r.last_name,
  r.first_name,
  r.middle_name,
  r.extension_name,
  r.sex,
  r.civil_status,
  r.birthdate,
  r.birth_region,
  r.birth_province,
  r.birth_municipality,
  r.citizenship,
  r.contact_number,
  r.email,
  r.occupation,
  r.profession,
  r.monthly_income,
  r.employment_status,
  r.education_attainment,
  r.status,
  r.picture_path,
  r.indigenous_person,
  r.is_voter,
  r.is_employed,
  r.username,
  r.street_address,
  r.id_type,
  r.id_document_number,
  r.emergency_contact_person,
  r.emergency_contact_number,
  r.spouse_name,
  b.barangay_name,
  m.municipality_name,
  m.province,
  m.region,
  -- Household info (if registered via portal)
  h.house_number,
  h.street AS household_street,
  h.id AS household_id,
  h.housing_type,
  h.electricity,
  h.water_source,
  h.toilet_facility,
  -- Classifications
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'classification_id', rc.id,
        'classification_type', rc.classification_type,
        'classification_details', rc.classification_details
      )
    ) FILTER (WHERE rc.id IS NOT NULL),
    '[]'::jsonb
  )::json AS classifications
FROM residents r
LEFT JOIN barangays b ON r.barangay_id = b.id
LEFT JOIN municipalities m ON b.municipality_id = m.id
-- Find household (as head, family head, or member)
LEFT JOIN family_members fm ON r.id = fm.family_member
LEFT JOIN families f ON (fm.family_id = f.id) OR (r.id = f.family_head)
LEFT JOIN households h ON (f.household_id = h.id) OR (r.id = h.house_head)
LEFT JOIN resident_classifications rc ON r.id = rc.resident_id
WHERE r.id = $1
GROUP BY
  r.id, r.resident_id, r.barangay_id,
  r.last_name, r.first_name, r.middle_name, r.extension_name,
  r.sex, r.civil_status, r.birthdate,
  r.birth_region, r.birth_province, r.birth_municipality,
  r.citizenship, r.contact_number, r.email,
  r.occupation, r.profession, r.monthly_income,
  r.employment_status, r.education_attainment,
  r.status, r.picture_path, r.indigenous_person,
  r.is_voter, r.is_employed, r.username, r.street_address,
  r.id_type, r.id_document_number,
  r.emergency_contact_person, r.emergency_contact_number,
  r.spouse_name,
  b.barangay_name, m.municipality_name, m.province, m.region,
  h.house_number, h.street, h.id, h.housing_type, h.electricity, h.water_source, h.toilet_facility;
`;

// =============================================================================
// READ: Public QR scan (masked name only)
// =============================================================================

export const VIEW_PUBLIC_RESIDENT_INFORMATION = `
SELECT
  r.id,
  r.resident_id,
  r.barangay_id,
  CONCAT(r.first_name, ' ', LEFT(r.last_name, 1), '.') AS full_name,
  b.barangay_name AS barangay,
  m.municipality_name AS municipality
FROM residents r
LEFT JOIN barangays b ON r.barangay_id = b.id
LEFT JOIN municipalities m ON b.municipality_id = m.id
WHERE r.resident_id = $1;
`;

// =============================================================================
// CLASSIFICATIONS
// =============================================================================

export const INSERT_CLASSIFICATION = `
INSERT INTO resident_classifications(
  resident_id,
  classification_type,
  classification_details
) VALUES ($1, $2, $3)
RETURNING *;
`;

export const CLASSIFICATION_LIST = `
SELECT * FROM resident_classifications ORDER BY id DESC;
`;

export const UPDATE_CLASSIFICATION = `
UPDATE resident_classifications SET
  classification_type = $2,
  classification_details = $3
WHERE id = $1
RETURNING *;
`;

export const DELETE_CLASSIFICATION = `
DELETE FROM resident_classifications 
WHERE id = $1
RETURNING *;
`;

// =============================================================================
// CLASSIFICATION TYPES
// =============================================================================

export const GET_CLASSIFICATION_TYPES = `
SELECT * FROM classification_types 
WHERE municipality_id = $1 AND is_active = true 
ORDER BY name ASC;
`;

export const GET_CLASSIFICATION_TYPE_BY_ID = `
SELECT * FROM classification_types 
WHERE id = $1 AND municipality_id = $2;
`;

export const INSERT_CLASSIFICATION_TYPE = `
INSERT INTO classification_types(
  municipality_id,
  name,
  description,
  color,
  details
) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (municipality_id, name)
DO UPDATE SET
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  details = EXCLUDED.details,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;
`;

export const UPDATE_CLASSIFICATION_TYPE = `
UPDATE classification_types SET
  name = $3,
  description = $4,
  color = $5,
  details = $6,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND municipality_id = $2
RETURNING *;
`;

export const DELETE_CLASSIFICATION_TYPE = `
UPDATE classification_types SET
  is_active = false,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND municipality_id = $2
RETURNING *;
`;

export const CHECK_CLASSIFICATION_TYPE_EXISTS = `
SELECT COUNT(*) FROM classification_types 
WHERE municipality_id = $1 AND name = $2 AND is_active = true;
`;
