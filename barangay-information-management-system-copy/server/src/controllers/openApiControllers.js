import { pool } from "../config/db.js";

const parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const listResidents = async (req, res) => {
  const { municipalityId } = req.openapi;
  const { page, limit, offset } = parsePagination(req);
  const q = (req.query.q || "").trim();

  const client = await pool.connect();
  try {
    // Build WHERE and params separately for data and count to keep placeholders correct
    let where = "b.municipality_id = $1";
    const paramsCount = [municipalityId];
    const paramsData = [municipalityId];
    if (q) {
      // Filter by human-readable resident_id (e.g. RES-2026-0010002), partial match
      where += " AND r.resident_id ILIKE $2";
      paramsCount.push(`%${q}%`);
      paramsData.push(`%${q}%`);
    }

    // For data query, append limit/offset at the end
    paramsData.push(limit, offset);

    const dataSql = `
      SELECT
        r.id,
        r.resident_id,
        r.barangay_id,
        r.last_name,
        r.first_name,
        r.middle_name,
        r.extension_name,
        r.sex,
        r.civil_status,
        r.birthdate,
        r.birth_region,
        r.contact_number,
        r.email,
        r.occupation,
        r.monthly_income,
        r.employment_status,
        r.education_attainment,
        r.status,
        r.picture_path,
        r.indigenous_person,
        r.created_at,
        r.updated_at
      FROM residents r
      JOIN barangays b ON b.id = r.barangay_id
      WHERE ${where}
      ORDER BY r.created_at DESC
      LIMIT $${paramsData.length - 1} OFFSET $${paramsData.length}`;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM residents r
      JOIN barangays b ON b.id = r.barangay_id
      WHERE ${where}`;

    const [dataResult, countResult] = await Promise.all([
      client.query(dataSql, paramsData),
      client.query(countSql, paramsCount),
    ]);

    const total = countResult.rows[0].total;
    res.json({ success: true, data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } finally {
    client.release();
  }
};

export const listHouseholds = async (req, res) => {
  const { municipalityId } = req.openapi;
  const { page, limit, offset } = parsePagination(req);
  const client = await pool.connect();
  try {
    const dataSql = `
      SELECT h.id, h.house_number, h.street, h.barangay_id, h.house_head, h.housing_type, h.structure_type
      FROM households h
      JOIN barangays b ON b.id = h.barangay_id
      WHERE b.municipality_id = $1
      ORDER BY h.created_at DESC
      LIMIT $2 OFFSET $3`;
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM households h
      JOIN barangays b ON b.id = h.barangay_id
      WHERE b.municipality_id = $1`;
    const [dataResult, countResult] = await Promise.all([
      client.query(dataSql, [municipalityId, limit, offset]),
      client.query(countSql, [municipalityId]),
    ]);
    const total = countResult.rows[0].total;
    res.json({ success: true, data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } finally {
    client.release();
  }
};

export const listFamilies = async (req, res) => {
  const { municipalityId } = req.openapi;
  const { page, limit, offset } = parsePagination(req);
  const client = await pool.connect();
  try {
    const dataSql = `
      SELECT f.id, f.household_id, f.family_group, f.family_head
      FROM families f
      JOIN households h ON h.id = f.household_id
      JOIN barangays b ON b.id = h.barangay_id
      WHERE b.municipality_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3`;
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM families f
      JOIN households h ON h.id = f.household_id
      JOIN barangays b ON b.id = h.barangay_id
      WHERE b.municipality_id = $1`;
    const [dataResult, countResult] = await Promise.all([
      client.query(dataSql, [municipalityId, limit, offset]),
      client.query(countSql, [municipalityId]),
    ]);
    const total = countResult.rows[0].total;
    res.json({ success: true, data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } finally {
    client.release();
  }
};

export const listBarangays = async (req, res) => {
  const { municipalityId } = req.openapi;
  const { page, limit, offset } = parsePagination(req);
  const client = await pool.connect();
  try {
    const [dataResult, countResult] = await Promise.all([
      client.query(
        `SELECT id, barangay_name, barangay_code, contact_number, email
         FROM barangays WHERE municipality_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [municipalityId, limit, offset]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total FROM barangays WHERE municipality_id = $1`,
        [municipalityId]
      ),
    ]);
    const total = countResult.rows[0].total;
    res.json({ success: true, data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } finally {
    client.release();
  }
};

export const getStatistics = async (req, res) => {
  const { municipalityId } = req.openapi;
  const client = await pool.connect();
  try {
    const [residentCounts, householdCounts, familyCounts] = await Promise.all([
      client.query(
        `SELECT COUNT(*)::int AS total,
                SUM(CASE WHEN sex='male' THEN 1 ELSE 0 END)::int AS male,
                SUM(CASE WHEN sex='female' THEN 1 ELSE 0 END)::int AS female
         FROM residents r
         JOIN barangays b ON b.id = r.barangay_id
         WHERE b.municipality_id = $1`,
        [municipalityId]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total FROM households h
         JOIN barangays b ON b.id = h.barangay_id
         WHERE b.municipality_id = $1`,
        [municipalityId]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total FROM families f
         JOIN households h ON h.id = f.household_id
         JOIN barangays b ON b.id = h.barangay_id
         WHERE b.municipality_id = $1`,
        [municipalityId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        residents: residentCounts.rows[0],
        households: householdCounts.rows[0],
        families: familyCounts.rows[0],
      },
    });
  } finally {
    client.release();
  }
};


