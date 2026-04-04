export const INSERT_MUNICIPALITY = `
  INSERT INTO municipalities (municipality_name, municipality_code, region, province, description, municipality_logo_path, id_background_front_path, id_background_back_path)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING id;
`;

export const UPDATE_MUNICIPALITY = `
  UPDATE municipalities SET
    municipality_name = $2,
    municipality_code = $3,
    region = $4,
    province = $5,
    description = $6,
    gis_code = $7,
    municipality_logo_path = $8,
    id_background_front_path = $9,  
    id_background_back_path = $10
  WHERE id = $1
  RETURNING id;
`;

export const MUNICIPALITY_INFORMATION = `
  SELECT 
    id AS municipality_id,
    municipality_name,
    municipality_code,
    region,
    province,
    description,
    gis_code,
    municipality_logo_path,
    id_background_front_path,
    id_background_back_path
  FROM municipalities;
`;

export const MUNICIPALITY_INFORMATION_BY_ID = `
  SELECT 
    id AS municipality_id,
    municipality_name,
    municipality_code,
    region,
    province,
    description,
    gis_code,
    municipality_logo_path,
    id_background_front_path,
    id_background_back_path
  FROM municipalities
  WHERE id = $1;
`;
