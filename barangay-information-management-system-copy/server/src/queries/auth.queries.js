export const FIND_USER_BY_EMAIL = `
  SELECT 
    id, 
    email, 
    full_name, 
    password, 
    target_type, 
    target_id, 
    role, 
    reset_token, 
    reset_token_expiry,
    CASE 
      WHEN picture_path IS NOT NULL THEN CONCAT('${process.env.BASE_URL || "http://localhost:5000"}/', picture_path)
      ELSE NULL 
    END as picture_path
  FROM bims_users 
  WHERE email = $1
`;

export const FIND_USER_BY_ID = `
  SELECT 
    id, 
    email, 
    password, 
    full_name, 
    target_type, 
    target_id, 
    role,
    CASE 
      WHEN picture_path IS NOT NULL THEN CONCAT('${process.env.BASE_URL || "http://localhost:5000"}/', picture_path)
      ELSE NULL 
    END as picture_path
  FROM bims_users 
  WHERE id = $1
`;

export const UPDATE_RESET_TOKEN = `
  UPDATE bims_users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3
`;

export const UPDATE_PASSWORD = `
  UPDATE bims_users SET password = $1 WHERE id = $2
`;

export const CLEAR_RESET_TOKEN = `
  UPDATE bims_users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = $1
`;
