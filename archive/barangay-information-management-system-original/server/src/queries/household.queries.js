export const INSERT_HOUSEHOLD = `
INSERT INTO households(
  house_number,
  street,
  purok_id,
  barangay_id,
  house_head,
  housing_type,
  structure_type,
  electricity,
  water_source,
  toilet_facility,
  geom,
  area,
  household_image_path
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
  $11, $12, $13)
RETURNING id;
`;

export const INSERT_FAMILY = `
INSERT INTO families(
  household_id,
  family_group,
  family_head
) VALUES ($1, $2, $3)
RETURNING id;
`;

export const CHECK_HOUSEHOLD_BY_HOUSE_HEAD = `
SELECT id, house_number, street, barangay_id
FROM households 
WHERE house_head = $1
LIMIT 1;
`;

export const CHECK_RESIDENT_IN_HOUSEHOLD = `
SELECT 
  h.id as household_id,
  h.house_number,
  h.street,
  h.barangay_id,
  CASE 
    WHEN h.house_head = $1 THEN 'house_head'
    WHEN f.family_head = $1 THEN 'family_head'
    WHEN fm.family_member = $1 THEN 'family_member'
  END as role
FROM households h
LEFT JOIN families f ON h.id = f.household_id
LEFT JOIN family_members fm ON f.id = fm.family_id
WHERE h.house_head = $1 OR f.family_head = $1 OR fm.family_member = $1
LIMIT 1;
`;

export const INSERT_FAMILY_MEMBER = `
INSERT INTO family_members(
  family_id,
  family_member,
  relationship_to_head
) VALUES ($1, $2, $3)
RETURNING id;
`;

export const UPDATE_HOUSEHOLD = `
UPDATE households SET
  house_number = $2,
  street = $3,
  purok_id = $4,
  barangay_id = $5,
  house_head = $6,
  housing_type = $7,
  structure_type = $8,
  electricity = $9,
  water_source = $10,
  toilet_facility = $11,
  geom = $12,
  area = $13,
  household_image_path = $14
WHERE id = $1
RETURNING id;
`;

export const UPDATE_FAMILY = `
UPDATE families SET
  household_id = $2,
  family_group = $3,
  family_head = $4
WHERE id = $1
RETURNING id;
`;

export const UPDATE_FAMILY_MEMBER = `
UPDATE family_members SET
  family_id = $2,
  family_member = $3,
  relationship_to_head = $4
WHERE id = $1
RETURNING id;
`;

export const VIEW_HOUSEHOLD_INFORMATION = `
  SELECT
    h.id AS household_id,
    h.house_number,
    h.street,
    p.purok_name,
    p.id AS purok_id,
    b.barangay_name,
    b.id AS barangay_id,
    CONCAT_WS(' ', hh.first_name, hh.middle_name, hh.last_name, hh.suffix) AS house_head,
    hh.id AS house_head_id,
    hh.contact_number AS house_head_contact_number,
    h.housing_type,
    h.structure_type,
    h.electricity,
    h.water_source,
    h.toilet_facility,
    ST_AsGeoJSON(h.geom) AS geom,
    h.area,
    h.household_image_path,
    COALESCE(income_stats.total_monthly_income, 0) AS total_monthly_income,
    COALESCE(json_agg(
      DISTINCT jsonb_build_object(
        'family_id', f.id,
        'family_head_id', f.family_head,
        'family_group', f.family_group,
        'family_head', CONCAT_WS(' ', fh.first_name, fh.middle_name, fh.last_name, fh.suffix),
        'members', (
          SELECT json_agg(
            DISTINCT jsonb_build_object(
              'fm_id', fm.id,
              'fm_member_id', fm.family_member,
              'fm_member', CONCAT_WS(' ', rm.first_name, rm.middle_name, rm.last_name, rm.suffix),
              'fm_relationship_to_fm_head', fm.relationship_to_head
            )
          )
          FROM family_members fm
          JOIN residents rm ON fm.family_member = rm.id
          WHERE fm.family_id = f.id
        )
      )
    ) FILTER (WHERE f.id IS NOT NULL), '[]') AS families
  FROM households h
  LEFT JOIN puroks p ON h.purok_id = p.id
  LEFT JOIN barangays b ON h.barangay_id = b.id
  LEFT JOIN residents hh ON h.house_head = hh.id
  LEFT JOIN families f ON h.id = f.household_id
  LEFT JOIN residents fh ON f.family_head = fh.id
  LEFT JOIN (
    SELECT 
      h.id as household_id,
      COALESCE(SUM(DISTINCT r_income.monthly_income), 0) as total_monthly_income
    FROM households h
    LEFT JOIN (
      -- Get house head income
      SELECT h_inner.id as household_id, r_house.monthly_income
      FROM households h_inner
      JOIN residents r_house ON r_house.id = h_inner.house_head
      UNION
      -- Get family head incomes
      SELECT fam.household_id, r_fam.monthly_income
      FROM families fam
      JOIN residents r_fam ON fam.family_head = r_fam.id
      UNION
      -- Get family member incomes
      SELECT fam2.household_id, r_mem.monthly_income
      FROM families fam2
      JOIN family_members fm2 ON fam2.id = fm2.family_id
      JOIN residents r_mem ON fm2.family_member = r_mem.id
    ) r_income ON r_income.household_id = h.id
    WHERE r_income.monthly_income IS NOT NULL
    GROUP BY h.id
  ) income_stats ON h.id = income_stats.household_id
  WHERE h.id = $1
  GROUP BY h.id, h.house_number, h.street, p.purok_name, p.id, b.barangay_name, b.id, hh.first_name, hh.middle_name, hh.last_name, hh.suffix, hh.id,
           h.housing_type, h.structure_type, h.electricity, h.water_source, h.toilet_facility, hh.contact_number, h.household_image_path, h.geom, h.area, income_stats.total_monthly_income;
`;

export const GET_HOUSEHOLD_LOCATIONS = `
  SELECT
    h.id AS household_id,
    h.house_number,
    h.street,
    p.purok_name,
    b.barangay_name,
    CONCAT_WS(' ', r.first_name, r.middle_name, r.last_name, r.suffix) AS house_head,
    h.housing_type,
    h.structure_type,
    h.electricity,
    h.water_source,
    h.toilet_facility,
    ST_AsGeoJSON(h.geom) AS geom,
    h.area,
    COALESCE(family_stats.family_count, 0) AS family_count,
    COALESCE(family_stats.resident_count, 0) AS resident_count
  FROM households h
  LEFT JOIN residents r ON h.house_head = r.id
  LEFT JOIN puroks p ON h.purok_id = p.id
  LEFT JOIN barangays b ON h.barangay_id = b.id
  LEFT JOIN (
    SELECT 
      household_id,
      family_count,
      resident_count
    FROM (
      SELECT 
        f.household_id,
        COUNT(DISTINCT f.id) AS family_count,
        COUNT(DISTINCT f.family_head) + COUNT(DISTINCT fm.family_member) AS resident_count
      FROM families f
      LEFT JOIN family_members fm ON f.id = fm.family_id
      GROUP BY f.household_id
    ) family_stats_sub
  ) family_stats ON h.id = family_stats.household_id
  WHERE h.geom IS NOT NULL
  ORDER BY h.id DESC;
`;

// Sync Queries for Household Management for mobile app tatanggalin iba dito kung di magrequest ng crud per sa tingin ko sa mismong web bim na magupdate pag nasync na kasi pang sync lang naman sa mobile 
export const CHECK_HOUSEHOLD_EXISTS = `
SELECT id FROM households WHERE id = $1;
`;

export const CHECK_FAMILY_EXISTS = `
SELECT id FROM families WHERE id = $1;
`;

export const CHECK_FAMILY_MEMBER_EXISTS = `
SELECT id FROM family_members WHERE id = $1;
`;

export const SYNC_HOUSEHOLD_INSERT = `
INSERT INTO households(
  id,
  house_number,
  street,
  purok_id,
  barangay_id,
  house_head,
  housing_type,
  structure_type,
  electricity,
  water_source,
  toilet_facility,
  geom,
  area,
  household_image_path
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING id;
`;

export const SYNC_HOUSEHOLD_UPDATE = `
UPDATE households SET
  house_number = $2,
  street = $3,
  purok_id = $4,
  barangay_id = $5,
  house_head = $6,
  housing_type = $7,
  structure_type = $8,
  electricity = $9,
  water_source = $10,
  toilet_facility = $11,
  geom = $12,
  area = $13,
  household_image_path = $14
WHERE id = $1
RETURNING id;
`;

export const SYNC_FAMILY_INSERT = `
INSERT INTO families(
  id,
  household_id,
  family_group,
  family_head
) VALUES ($1, $2, $3, $4)
RETURNING id;
`;

export const SYNC_FAMILY_UPDATE = `
UPDATE families SET
  household_id = $2,
  family_group = $3,
  family_head = $4
WHERE id = $1
RETURNING id;
`;

export const SYNC_FAMILY_MEMBER_INSERT = `
INSERT INTO family_members(
  id,
  family_id,
  family_member,
  relationship_to_head
) VALUES ($1, $2, $3, $4)
RETURNING id;
`;

export const SYNC_FAMILY_MEMBER_UPDATE = `
UPDATE family_members SET
  family_id = $2,
  family_member = $3,
  relationship_to_head = $4
WHERE id = $1
RETURNING id;
`;