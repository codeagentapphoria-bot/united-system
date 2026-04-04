export const INSERT_BARANGAY = `
  INSERT INTO barangays (
    municipality_id, 
    barangay_name, 
    barangay_code,
    barangay_logo_path,
    certificate_background_path, 
    organizational_chart_path, 
    contact_number, 
    email,
    gis_code)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING id;
`;

export const UPDATE_BARANGAY = `
  UPDATE barangays SET
    municipality_id = $2,
    barangay_name = $3,
    barangay_code = $4,
    barangay_logo_path = $5,
    certificate_background_path = $6,
    organizational_chart_path = $7,
    contact_number = $8,
    email = $9,
    gis_code = $10
  WHERE id = $1
  RETURNING id;
`;

export const INSERT_PUROK = `
  INSERT INTO puroks (barangay_id, purok_name, purok_leader, description)
  VALUES ($1, $2, $3, $4)
  RETURNING id;
`;

export const UPDATE_PUROK = `
  UPDATE puroks SET
    barangay_id = $2,
    purok_name = $3,
    purok_leader = $4,
    description = $5
  WHERE id = $1
  RETURNING id;
`;

export const ADD_OFFICIAL = `
  INSERT INTO officials (
    barangay_id,
    resident_id,
    position,
    committee,
    term_start,
    term_end,
    responsibilities
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING id;
`;

export const UPDATE_OFFICIAL = `
  UPDATE officials SET
    barangay_id = $2,
    resident_id = $3,
    position = $4,
    committee = $5,
    term_start = $6,
    term_end = $7,
    responsibilities = $8
  WHERE id = $1
  RETURNING id;
`;

export const GET_OFFICIALS_LIST = `
  SELECT
    o.id AS official_id,
    o.position,
    o.committee,
    o.term_start,
    o.term_end,
    o.responsibilities,
    o.created_at,
    r.id AS resident_id,
    r.last_name,
    r.first_name,
    r.middle_name,
    r.suffix,
    r.occupation,
    r.contact_number,
    r.email,
    r.picture_path
  FROM officials o
  LEFT JOIN residents r ON o.resident_id = r.id
  WHERE o.barangay_id = $1
  ORDER BY o.position, r.last_name, r.first_name;
`;

export const GET_OFFICIAL_INFO = `
  SELECT
    o.id AS official_id,
    o.position,
    o.committee,
    o.term_start,
    o.term_end,
    o.responsibilities,
    o.created_at,
    r.id AS resident_id,
    r.last_name,
    r.first_name,
    r.middle_name,
    r.suffix,
    r.occupation,
    r.contact_number,
    r.email,
    r.picture_path
  FROM officials o
  LEFT JOIN residents r ON o.resident_id = r.id
  WHERE o.id = $1;
`;

export const DELETE_OFFICIAL = `
  DELETE FROM officials WHERE id = $1 RETURNING id;
`;
