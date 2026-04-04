export const INSERT_PREFIX = `
  INSERT INTO resident_counters(
    year,
    counter,
    prefix
  ) VALUES ($1, 1, $2)
  ON CONFLICT (year) DO UPDATE SET
    counter = resident_counters.counter + 1
  RETURNING counter;
`;

export const GET_PREFIX = `
  SELECT prefix FROM resident_counters LIMIT 1;
`;

export const UPDATE_PREFIX = `
  UPDATE resident_counters 
  SET prefix = $1 
  WHERE year = $2
  RETURNING prefix;
`;

export const INSERT_OR_UPDATE_PREFIX = `
  INSERT INTO resident_counters(year, counter, prefix) 
  VALUES ($1, 0, $2)
  ON CONFLICT (year) DO UPDATE SET
    prefix = EXCLUDED.prefix
  RETURNING prefix;
`;
