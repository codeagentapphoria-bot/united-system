export const INSERT_PET = `
INSERT INTO pets (
  owner_id,
  pet_name,
  species,
  breed,
  sex,
  birthdate,
  color,
  picture_path,
  description
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, uuid;
`;

export const UPDATE_PET = `
UPDATE pets SET
  owner_id = $2,
  pet_name = $3,
  species = $4,
  breed = $5,
  sex = $6,
  birthdate = $7,
  color = $8,
  picture_path = $9,
  description = $10,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, uuid;
`;

export const DELETE_PET = `
DELETE FROM pets WHERE id = $1 RETURNING id;
`;

export const LIST_PETS = `
SELECT
  id AS pet_id,
  owner_id,
  pet_name,
  species,
  breed,
  sex,
  birthdate,
  color,
  picture_path,
  description,
  created_at,
  updated_at
FROM pets
ORDER BY pet_name ASC;
`;

export const PET_INFO = `
SELECT
  p.id AS pet_id,
  p.uuid,
  p.owner_id,
  p.pet_name,
  p.species,
  p.breed,
  p.sex,
  p.birthdate,
  p.color,
  p.picture_path,
  p.description,
  p.created_at,
  p.updated_at,
  CONCAT(r.first_name, ' ', r.last_name) AS owner_name,
  r.resident_id AS owner_resident_id,
  r.contact_number AS owner_contact,
  h.id AS household_id,
  h.house_number,
  h.street,
  b.barangay_name AS barangay_name,
  CONCAT(COALESCE(h.house_number, ''), ' ', COALESCE(h.street, '')) AS address
FROM pets p
LEFT JOIN residents r ON p.owner_id = r.id
LEFT JOIN (
  -- Get household info for house heads
  SELECT r.id as resident_id, h.id, h.house_number, h.street
  FROM residents r
  JOIN households h ON h.house_head = r.id
  UNION
  -- Get household info for family members
  SELECT r.id as resident_id, h.id, h.house_number, h.street
  FROM residents r
  JOIN family_members fm ON fm.family_member = r.id
  JOIN families f ON f.id = fm.family_id
  JOIN households h ON h.id = f.household_id
) h ON h.resident_id = r.id
LEFT JOIN barangays b ON b.id = r.barangay_id
WHERE p.id = $1;
`;

export const PET_INFO_BY_UUID = `
SELECT
  p.id AS pet_id,
  p.uuid,
  p.owner_id,
  p.pet_name,
  p.species,
  p.breed,
  p.sex,
  p.birthdate,
  p.color,
  p.picture_path,
  p.description,
  p.created_at,
  p.updated_at,
  CONCAT(r.first_name, ' ', r.last_name) AS owner_name,
  r.resident_id AS owner_resident_id,
  r.contact_number AS owner_contact,
  h.id AS household_id,
  h.house_number,
  h.street,
  b.barangay_name AS barangay_name,
  CONCAT(COALESCE(h.house_number, ''), ' ', COALESCE(h.street, '')) AS address
FROM pets p
LEFT JOIN residents r ON p.owner_id = r.id
LEFT JOIN (
  -- Get household info for house heads
  SELECT r.id as resident_id, h.id, h.house_number, h.street
  FROM residents r
  JOIN households h ON h.house_head = r.id
  UNION
  -- Get household info for family members
  SELECT r.id as resident_id, h.id, h.house_number, h.street
  FROM residents r
  JOIN family_members fm ON fm.family_member = r.id
  JOIN families f ON f.id = fm.family_id
  JOIN households h ON h.id = f.household_id
) h ON h.resident_id = r.id
LEFT JOIN barangays b ON b.id = r.barangay_id
WHERE p.uuid = $1;
`;

export const PET_PICTURE_PATH = `
SELECT picture_path FROM pets WHERE id = $1;
`;
