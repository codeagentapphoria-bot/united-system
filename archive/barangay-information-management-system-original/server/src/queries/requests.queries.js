export const INSERT_REQUEST = `
INSERT INTO requests (
  resident_id,
  full_name,
  address,
  purpose,
  status
) VALUES ($1, $2, $3, $4, $5)
RETURNING id;
`;

export const UPDATE_REQUEST = `
UPDATE requests SET
  resident_id = $2,
  full_name = $3,
  address = $4,
  purpose = $5,
  status = $6,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id;
`;

export const DELETE_REQUEST = `
DELETE FROM requests 
WHERE id = $1
RETURNING id;
`;

export const VIEW_REQUEST_INFORMATION = `
SELECT
  r.id,
  r.resident_id,
  r.full_name,
  r.address,
  r.purpose,
  r.status,
  r.created_at,
  r.updated_at,
  res.first_name,
  res.last_name,
  res.middle_name,
  res.contact_number,
  res.email
FROM requests r
LEFT JOIN residents res ON r.resident_id = res.id
WHERE r.id = $1;
`;

export const REQUEST_LIST = `
SELECT
  r.id,
  r.resident_id,
  r.full_name,
  r.address,
  r.purpose,
  r.status,
  r.created_at,
  r.updated_at,
  res.first_name,
  res.last_name,
  res.middle_name,
  res.contact_number,
  res.email
FROM requests r
LEFT JOIN residents res ON r.resident_id = res.id
WHERE ($1::INTEGER IS NULL OR res.barangay_id = $1)
  AND ($2::VARCHAR IS NULL OR r.status = $2)
  AND ($3::VARCHAR IS NULL OR r.full_name ILIKE '%' || $3 || '%' OR r.purpose ILIKE '%' || $3 || '%')
ORDER BY r.created_at DESC
LIMIT $4 OFFSET $5;
`;

export const COUNT_REQUESTS = `
SELECT COUNT(*) as total
FROM requests r
LEFT JOIN residents res ON r.resident_id = res.id
WHERE ($1::INTEGER IS NULL OR res.barangay_id = $1)
  AND ($2::VARCHAR IS NULL OR r.status = $2)
  AND ($3::VARCHAR IS NULL OR r.full_name ILIKE '%' || $3 || '%' OR r.purpose ILIKE '%' || $3 || '%');
`; 