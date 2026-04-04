export const INSERT_USER = `
  INSERT INTO users (target_type, target_id, full_name, email, password, role, picture_path)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING id;
`;

export const UPDATE_USER = `
  UPDATE users SET
    target_type = $2,
    target_id = $3,
    full_name = $4, 
    email = $5,
    password = $6,
    role = $7,
    picture_path = $8
  WHERE id = $1
  RETURNING id;
`;

export const UPDATE_USER_WITHOUT_PASSWORD = `
  UPDATE users SET
    target_type = $2,
    target_id = $3,
    full_name = $4, 
    email = $5,
    role = $6,
    picture_path = $7
  WHERE id = $1
  RETURNING id;
`;

export const FIND_BY_EMAIL = `
  SELECT id, 
         CASE WHEN password IS NOT NULL AND password <> '' THEN 'yes' ELSE NULL END AS password
  FROM users 
  WHERE email = $1;
`;

export const GET_USERS_BY_TARGET = `
  SELECT 
    id,
    full_name,
    email,
    role,
    target_type,
    target_id,
    is_active,
    last_login,
    created_at,
    updated_at,
    CASE 
      WHEN picture_path IS NOT NULL THEN CONCAT('${process.env.BASE_URL || "http://localhost:5000"}/', picture_path)
      ELSE NULL 
    END as picture_path,
    CASE 
      WHEN target_type = 'barangay' THEN 'Barangay ' || target_id
      WHEN target_type = 'municipality' THEN 'Municipality ' || target_id
      ELSE 'Unknown Target'
    END as target_name
  FROM users
  WHERE target_type = $1 AND target_id = $2
  ORDER BY full_name ASC;
`;

export const GET_USER_BY_ID = `
  SELECT 
    u.id,
    u.full_name,
    u.email,
    u.role,
    u.target_type,
    u.target_id,
    u.is_active,
    u.last_login,
    u.created_at,
    u.updated_at,
    CASE 
      WHEN u.picture_path IS NOT NULL THEN CONCAT('${process.env.BASE_URL || "http://localhost:5000"}/', u.picture_path)
      ELSE NULL 
    END as picture_path,
    CASE 
      WHEN u.target_type = 'barangay' THEN b.barangay_name
      WHEN u.target_type = 'municipality' THEN m.municipality_name
      ELSE NULL
    END as target_name
  FROM users u
  LEFT JOIN barangays b ON u.target_id = b.id AND u.target_type = 'barangay'
  LEFT JOIN municipalities m ON u.target_id = m.id AND u.target_type = 'municipality'
  WHERE u.id = $1;
`;
