export const INSERT_INVENTORY = `
INSERT INTO inventories (
  barangay_id,
  item_name,
  item_type,
  description,
  sponsors,
  quantity,
  unit,
  file_path
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;
`;

export const UPDATE_INVENTORY = `
UPDATE inventories SET
  barangay_id = $2,
  item_name = $3,
  item_type = $4,
  description = $5,
  sponsors = $6,
  quantity = $7,
  unit = $8,
  file_path = $9,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id;
`;

export const DELETE_INVENTORY = `
DELETE FROM inventories WHERE id = $1 RETURNING id;
`;

export const LIST_INVENTORIES = `
SELECT
  id AS inventory_id,
  barangay_id,
  item_name,
  item_type,
  description,
  sponsors,
  quantity,
  unit,
  file_path,
  created_at,
  updated_at
FROM inventories
ORDER BY created_at DESC;
`;

export const INVENTORY_INFO = `
SELECT
  id AS inventory_id,
  barangay_id,
  item_name,
  item_type,
  description,
  sponsors,
  quantity,
  unit,
  file_path,
  created_at,
  updated_at
FROM inventories
WHERE id = $1;
`;

export const INVENTORY_FILE_PATH = `
SELECT file_path FROM inventories WHERE id = $1;
`; 