export const INSERT_RESIDENT = `
INSERT INTO residents (
  id,
  barangay_id,
  last_name,
  first_name,
  middle_name,
  suffix,
  sex,
  civil_status,
  birthdate,
  birthplace,
  contact_number,
  email,
  occupation,
  monthly_income,
  employment_status,
  education_attainment,
  resident_status,
  picture_path,
  indigenous_person
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
RETURNING id;
`;

export const UPDATE_RESIDENT = `
UPDATE residents SET
  barangay_id = $2,
  last_name = $3,
  first_name = $4,
  middle_name = $5,
  suffix = $6,
  sex = $7,
  civil_status = $8,
  birthdate = $9,
  birthplace = $10,
  contact_number = $11,
  email = $12,
  occupation = $13,
  monthly_income = $14,
  employment_status = $15,
  education_attainment = $16,
  resident_status = $17,
  picture_path = COALESCE(NULLIF($18, ''), picture_path),
  indigenous_person = $19
WHERE id = $1
RETURNING id;
`;

export const VIEW_RESIDENT_INFORMATION = `
SELECT
  r.id AS resident_id,
  r.barangay_id,
  r.last_name,
  r.first_name,
  r.middle_name,
  r.suffix,
  r.sex,
  r.civil_status,
  r.birthdate,
  r.birthplace,
  r.contact_number,
  r.email,
  r.occupation,
  r.monthly_income,
  r.employment_status,
  r.education_attainment,
  r.resident_status,
  r.picture_path,
  r.indigenous_person,
  h.house_number,
  h.street,
  p.purok_name,
  p.id AS purok_id,
  b.barangay_name,
  h.id AS household_id,
  m.municipality_name,
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
LEFT JOIN family_members fm ON r.id = fm.family_member
LEFT JOIN families f ON (fm.family_id = f.id) OR (r.id = f.family_head)
LEFT JOIN households h ON (f.household_id = h.id) OR (r.id = h.house_head)
LEFT JOIN puroks p ON h.purok_id = p.id
LEFT JOIN barangays b ON r.barangay_id = b.id
LEFT JOIN municipalities m ON b.municipality_id = m.id
LEFT JOIN resident_classifications rc ON r.id = rc.resident_id
WHERE r.id = $1
GROUP BY
  r.id, r.last_name, r.first_name, r.middle_name, r.suffix, r.sex, r.civil_status, r.birthdate, r.birthplace, r.contact_number, r.email, r.occupation, r.monthly_income, r.employment_status, r.education_attainment, r.resident_status, r.picture_path, r.indigenous_person,
  h.house_number, h.street, h.id,
  p.purok_name, p.id,
  b.barangay_name,
  m.municipality_name;
`;

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

// Classification Types Queries
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

export const DELETE_CLASSIFICATION = `
DELETE FROM resident_classifications 
WHERE id = $1
RETURNING *;
`;

export const VIEW_PUBLIC_RESIDENT_INFORMATION = `
SELECT
  r.id,
  r.id AS resident_id,
  r.barangay_id,
  CONCAT(r.first_name, ' ', LEFT(r.last_name, 1), '.') AS full_name,
  b.barangay_name AS barangay
FROM residents r
LEFT JOIN barangays b ON r.barangay_id = b.id
WHERE r.id = $1;
`;
