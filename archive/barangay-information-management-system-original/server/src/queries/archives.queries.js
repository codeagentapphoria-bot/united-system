export const INSERT_ARCHIVE = `
INSERT INTO archives (
  barangay_id,
  title,
  document_type,
  description,
  author,
  signatory,
  relate_resident,
  file_path
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id AS archive_id;
`;

export const UPDATE_ARCHIVE = `
UPDATE archives SET
  barangay_id = $2,
  title = $3,
  document_type = $4,
  description = $5,
  author = $6,
  signatory = $7,
  relate_resident = $8,
  file_path = $9,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id AS archive_id;
`;

export const DELETE_ARCHIVE = `
DELETE FROM archives WHERE id = $1 RETURNING id AS archive_id;
`;

export const LIST_ARCHIVES = `
SELECT
  id AS archive_id,
  barangay_id,
  title,
  document_type,
  description,
  author,
  signatory,
  relate_resident,
  file_path,
  created_at,
  updated_at
FROM archives
ORDER BY created_at DESC;
`;

export const ARCHIVE_INFO = `
SELECT
  id AS archive_id,
  barangay_id,
  title,
  document_type,
  description,
  author,
  signatory,
  relate_resident,
  file_path,
  created_at,
  updated_at
FROM archives
WHERE id = $1;
`;

export const ARCHIVE_FILE_PATH = `
SELECT file_path FROM archives WHERE id = $1;
`; 