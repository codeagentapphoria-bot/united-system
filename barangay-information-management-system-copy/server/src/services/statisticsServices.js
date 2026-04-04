import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

class Statistics {
  // NOTE: puroks table was removed in v2 schema. All purokId-related code paths below
  // are kept as dead code/comments but should be cleaned up in a future refactor.

  /**
   * Returns age group demographics, optionally filtered by barangayId.
   * @param {Object} options
   * @param {string|number} [options.barangayId]
   * @returns {Promise<Array<{ age_group: string, count: number }>>}
   */
  static async getAgeDemographics({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Standard approach - puroks removed in v2
      query = `
        SELECT
          CASE
            WHEN age BETWEEN 0 AND 4 THEN '0-4'
            WHEN age BETWEEN 5 AND 9 THEN '5-9'
            WHEN age BETWEEN 10 AND 14 THEN '10-14'
            WHEN age BETWEEN 15 AND 19 THEN '15-19'
            WHEN age BETWEEN 20 AND 24 THEN '20-24'
            WHEN age BETWEEN 25 AND 29 THEN '25-29'
            WHEN age BETWEEN 30 AND 34 THEN '30-34'
            WHEN age BETWEEN 35 AND 39 THEN '35-39'
            WHEN age BETWEEN 40 AND 44 THEN '40-44'
            WHEN age BETWEEN 45 AND 49 THEN '45-49'
            WHEN age BETWEEN 50 AND 54 THEN '50-54'
            WHEN age BETWEEN 55 AND 59 THEN '55-59'
            WHEN age BETWEEN 60 AND 64 THEN '60-64'
            WHEN age BETWEEN 65 AND 69 THEN '65-69'
            WHEN age BETWEEN 70 AND 74 THEN '70-74'
            WHEN age BETWEEN 75 AND 79 THEN '75-79'
            WHEN age >= 80 THEN '80+'
            ELSE 'Unknown'
          END AS age_group,
          COUNT(*) AS count
        FROM (
          SELECT r.*, EXTRACT(YEAR FROM AGE(NOW(), r.birthdate))::int AS age
          FROM residents r
      `;
      const whereClauses = ["r.status = 'active'"];

      if (barangayId) {
        whereClauses.push(`r.barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }

      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }

      query += `
        ) AS sub
        GROUP BY age_group
        ORDER BY age_group
      `;

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error getting age demographics:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getGenderDemographics({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Use the same approach as total population for consistency
        query = `SELECT COALESCE(sex, 'unknown') as sex, COUNT(*) AS count FROM residents r`;
        const whereClauses = ["r.status = 'active'"];

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

        query += " GROUP BY COALESCE(sex, 'unknown')";

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error getting gender demographics:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getCivilStatusDemographics({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Standard approach for non-purok filtering
        query = `SELECT civil_status, COUNT(*) AS count FROM residents r`;
        const whereClauses = ["r.status = 'active'"];

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

        query += " GROUP BY civil_status";

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error getting civil status demographics:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getEducationalAttainmentDemographics({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Standard approach for non-purok filtering
        query = `SELECT education_attainment, COUNT(*) AS count FROM residents r`;
        const whereClauses = ["r.status = 'active'"];

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

        query += " GROUP BY education_attainment";

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error getting educational attainment demographics:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getEmploymentStatusDemographics({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Standard approach for non-purok filtering
        query = `SELECT employment_status, COUNT(*) AS count FROM residents r`;
        const whereClauses = ["r.status = 'active'"];

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

        query += " GROUP BY employment_status ORDER BY employment_status";

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error getting employment status demographics:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getHouseholdSizeDemographics({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      // Count number of residents per household
      let query = `
                SELECT household_id, COUNT(*) AS household_size
                FROM (
                    SELECT h.id AS household_id, r.id AS resident_id
                    FROM households h
                    LEFT JOIN families f ON f.household_id = h.id
                    LEFT JOIN family_members fm ON fm.family_id = f.id
                    LEFT JOIN residents r ON r.id = fm.family_member
            `;
      const joins = [];
      const whereClauses = [];
      const values = [];
      let paramIndex = 1;
      if (barangayId) {
        whereClauses.push(`h.barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }
      query += " " + joins.join(" ");
      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }
      query += `
                    ) AS sub
                GROUP BY household_id
                ORDER BY household_id
            `;
      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error getting household size demographics:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTotalFemaleTotalmaleTotalPopulation({
    barangayId,
    classificationType,
  } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Standard approach for non-purok filtering
        query = `SELECT
          COUNT(*) FILTER (WHERE sex = 'male') AS total_male,
          COUNT(*) FILTER (WHERE sex = 'female') AS total_female,
          COUNT(*) AS total_population
          FROM residents r`;
        const whereClauses = ["r.status = 'active'"];

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        // Add classification filter if specified
        if (classificationType) {
          whereClauses.push(`r.id IN (
            SELECT rc.resident_id
            FROM resident_classifications rc
            WHERE rc.classification_type = $${paramIndex++}
          )`);
          values.push(classificationType);
        }

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

      const result = await client.query(query, values);

      // Query for residents added this month
      let monthQuery;
      const monthValues = [];
      let monthParamIndex = 1;

      // Standard approach for non-purok filtering
        monthQuery = `SELECT COUNT(*) AS added_this_month FROM residents r`;
        const monthWhereClauses = [
          `r.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
          `r.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`,
          `r.status = 'active'`,
        ];

        if (barangayId) {
          monthWhereClauses.push(`r.barangay_id = $${monthParamIndex++}`);
          monthValues.push(barangayId);
        }

        // Add classification filter if specified
        if (classificationType) {
          monthWhereClauses.push(`r.id IN (
            SELECT rc.resident_id
            FROM resident_classifications rc
            WHERE rc.classification_type = $${monthParamIndex++}
          )`);
          monthValues.push(classificationType);
        }

        if (monthWhereClauses.length > 0) {
          monthQuery += " WHERE " + monthWhereClauses.join(" AND ");
        }

      const monthResult = await client.query(monthQuery, monthValues);
      const addedThisMonth = monthResult.rows[0]?.added_this_month || 0;

      // Purok breakdown removed — puroks table dropped in v2 schema
      const purokBreakdown = [];

      // Get detailed breakdown by barangay if no specific barangay is selected
      let barangayBreakdown = [];
      if (!barangayId) { // Puroks removed in v2
        const barangayQuery = `
          SELECT 
            b.id as barangay_id,
            b.barangay_name,
            COUNT(*) AS total_population,
            COUNT(*) FILTER (WHERE r.sex = 'male') AS total_male,
            COUNT(*) FILTER (WHERE r.sex = 'female') AS total_female,
            COUNT(*) FILTER (
              WHERE r.created_at >= DATE_TRUNC('month', CURRENT_DATE)
              AND r.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
            ) AS added_this_month
          FROM residents r
          JOIN barangays b ON b.id = r.barangay_id
          WHERE r.status = 'active'
          GROUP BY b.id, b.barangay_name
          ORDER BY b.barangay_name
        `;
        const barangayResult = await client.query(barangayQuery);
        barangayBreakdown = barangayResult.rows;
      }

      return {
        ...result.rows[0],
        added_this_month: Number(addedThisMonth),
        purok_breakdown: purokBreakdown,
        barangay_breakdown: barangayBreakdown,
      };
    } catch (error) {
      logger.error(
        "Error getting total female, total male, and total population:",
        error
      );
      throw error;
    } finally {
      client.release();
    }
  }

  static async getResidentClassificationDemographics({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Query classifications directly without requiring classification_types table to be seeded
        query = `
          SELECT rc.classification_type, COUNT(*) AS count
          FROM resident_classifications rc
          JOIN residents r ON rc.resident_id = r.id
          JOIN barangays b ON r.barangay_id = b.id
        `;
        const whereClauses = [];

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        // Exclude voters from general classifications
        whereClauses.push("rc.classification_type != 'voter'");
        whereClauses.push("r.status = 'active'");

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

        query += " GROUP BY rc.classification_type ORDER BY rc.classification_type";

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error(
        "Error getting resident classification demographics:",
        error
      );
      throw error;
    } finally {
      client.release();
    }
  }

  static async getVoterDemographics({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Standard approach for non-purok filtering
        query = `
          SELECT
            CASE
              WHEN rc.classification_details::text LIKE '%SK%' THEN 'SK Voter'
              WHEN rc.classification_details::text LIKE '%Regular%' THEN 'Regular Voter'
              ELSE 'Other Voter'
            END AS voter_type,
            COUNT(*) AS count
          FROM resident_classifications rc
          JOIN residents r ON rc.resident_id = r.id
        `;
        const whereClauses = [];

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        whereClauses.push("r.status = 'active'");

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

        // Only get voters
        query += " AND rc.classification_type = 'Voter'";
        query += " GROUP BY voter_type ORDER BY voter_type";

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error getting voter demographics:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTotalHouseholdsAndAddedThisMonth({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query = `SELECT COUNT(*) AS total_households FROM households h`;
      const joins = [];
      const whereClauses = [];
      const values = [];
      let paramIndex = 1;

      // Filter directly on households.barangay_id (puroks removed in v2)
      if (barangayId) {
        whereClauses.push(`h.barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }
      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }
      const result = await client.query(query, values);

      // Query for households added this month
      let monthQuery = `SELECT COUNT(*) AS added_this_month FROM households h`;
      const monthWhereClauses = [
        `h.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        `h.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`,
      ];
      const monthValues = [];
      let monthParamIndex = 1;

      if (barangayId) {
        monthWhereClauses.push(`h.barangay_id = $${monthParamIndex++}`);
        monthValues.push(barangayId);
      }
      monthQuery += " WHERE " + monthWhereClauses.join(" AND ");
      const monthResult = await client.query(monthQuery, monthValues);
      const addedThisMonth = monthResult.rows[0]?.added_this_month || 0;

      // Breakdown by barangay when no filter is applied
      let barangayBreakdown = [];
      if (!barangayId) {
        const barangayQuery = `
          SELECT
            b.id as barangay_id,
            b.barangay_name,
            COUNT(DISTINCT h.id) AS total_households,
            COUNT(DISTINCT h.id) FILTER (
              WHERE h.created_at >= DATE_TRUNC('month', CURRENT_DATE)
              AND h.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
            ) AS added_this_month
          FROM households h
          JOIN barangays b ON b.id = h.barangay_id
          GROUP BY b.id, b.barangay_name
          ORDER BY b.barangay_name
        `;
        const barangayResult = await client.query(barangayQuery);
        barangayBreakdown = barangayResult.rows;
      }

      // Calculate total residents for the filtered households
      let totalResidents = 0;
      if (result.rows[0]?.total_households > 0) {
        const brgyFilter = barangayId ? `WHERE h.barangay_id = $1` : "";
        const residentsQuery = `
          SELECT COUNT(DISTINCT r.id) AS total_residents
          FROM residents r
          WHERE r.status = 'active'
          AND r.id IN (
            SELECT h.house_head FROM households h ${brgyFilter}
            UNION
            SELECT fm.family_member
            FROM family_members fm
            JOIN families f ON f.id = fm.family_id
            JOIN households h ON h.id = f.household_id
            ${brgyFilter}
          )
        `;
        const residentsValues = barangayId ? [barangayId] : [];
        const residentsResult = await client.query(residentsQuery, residentsValues);
        totalResidents = residentsResult.rows[0]?.total_residents || 0;
      }

      return {
        ...result.rows[0],
        total_residents: Number(totalResidents),
        added_this_month: Number(addedThisMonth),
        barangay_breakdown: barangayBreakdown,
      };
    } catch (error) {
      logger.error("Error getting total households:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTotalFamiliesAndAddedThisMonth({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      // Filter via households.barangay_id (puroks removed in v2)
      let query = `SELECT COUNT(*) AS total_families FROM families f`;
      const whereClauses = [];
      const values = [];
      let paramIndex = 1;

      if (barangayId) {
        query += ` JOIN households h ON h.id = f.household_id`;
        whereClauses.push(`h.barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }
      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }
      const result = await client.query(query, values);

      // Query for families added this month
      let monthQuery = `SELECT COUNT(*) AS added_this_month FROM families f`;
      const monthWhereClauses = [
        `f.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        `f.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`,
      ];
      const monthValues = [];
      let monthParamIndex = 1;

      if (barangayId) {
        monthQuery += ` JOIN households h ON h.id = f.household_id`;
        monthWhereClauses.push(`h.barangay_id = $${monthParamIndex++}`);
        monthValues.push(barangayId);
      }
      monthQuery += " WHERE " + monthWhereClauses.join(" AND ");
      const monthResult = await client.query(monthQuery, monthValues);
      const addedThisMonth = monthResult.rows[0]?.added_this_month || 0;

      // Breakdown by barangay when no filter applied
      let barangayBreakdown = [];
      if (!barangayId) {
        const barangayQuery = `
          SELECT
            b.id as barangay_id,
            b.barangay_name,
            COUNT(DISTINCT f.id) AS total_families,
            COUNT(DISTINCT f.id) FILTER (
              WHERE f.created_at >= DATE_TRUNC('month', CURRENT_DATE)
              AND f.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
            ) AS added_this_month
          FROM families f
          JOIN households h ON h.id = f.household_id
          JOIN barangays b ON b.id = h.barangay_id
          GROUP BY b.id, b.barangay_name
          ORDER BY b.barangay_name
        `;
        const barangayResult = await client.query(barangayQuery);
        barangayBreakdown = barangayResult.rows;
      }

      return {
        ...result.rows[0],
        added_this_month: Number(addedThisMonth),
        barangay_breakdown: barangayBreakdown,
      };
    } catch (error) {
      logger.error("Error getting total families:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTotalRegisteredPetsAndAddedThisMonth({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query;
      const values = [];
      let paramIndex = 1;

      // Standard approach for non-purok filtering
        query = `SELECT COUNT(*) AS total_pets FROM pets p`;
        const joins = [];
        const whereClauses = [];

        // Always join with residents to get owner info
        joins.push(`JOIN residents r ON p.owner_id = r.id AND r.status = 'active'`);

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        query += " " + joins.join(" ");
        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

      const result = await client.query(query, values);

      // Query for pets added this month
      let monthQuery;
      const monthValues = [];
      let monthParamIndex = 1;

      // Standard approach for non-purok filtering
        monthQuery = `SELECT COUNT(*) AS added_this_month FROM pets p`;
        const monthJoins = [];
        const monthWhereClauses = [
          `p.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
          `p.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`,
        ];

        // Always join with residents to get owner info
        monthJoins.push(`JOIN residents r ON p.owner_id = r.id AND r.status = 'active'`);

        if (barangayId) {
          monthWhereClauses.push(`r.barangay_id = $${monthParamIndex++}`);
          monthValues.push(barangayId);
        }

        monthQuery += " " + monthJoins.join(" ");
        if (monthWhereClauses.length > 0) {
          monthQuery += " WHERE " + monthWhereClauses.join(" AND ");
        }

      const monthResult = await client.query(monthQuery, monthValues);
      const addedThisMonth = monthResult.rows[0]?.added_this_month || 0;

      // Get detailed breakdown by barangay if no specific barangay is selected
      let barangayBreakdown = [];
      if (!barangayId) { // Puroks removed in v2
        const barangayQuery = `
          SELECT 
            b.id as barangay_id,
            b.barangay_name,
            COUNT(*) AS total_pets,
            COUNT(*) FILTER (
              WHERE p.created_at >= DATE_TRUNC('month', CURRENT_DATE)
              AND p.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
            ) AS added_this_month
          FROM pets p
          JOIN residents r ON p.owner_id = r.id AND r.status = 'active'
          JOIN barangays b ON b.id = r.barangay_id
          GROUP BY b.id, b.barangay_name
          ORDER BY b.barangay_name
        `;
        const barangayResult = await client.query(barangayQuery);
        barangayBreakdown = barangayResult.rows;
      }

      return {
        ...result.rows[0],
        added_this_month: Number(addedThisMonth),
        barangay_breakdown: barangayBreakdown,
      };
    } catch (error) {
      logger.error("Error getting total registered pets:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Puroks removed in v2 — returns empty array
  static async getDetailedPopulationStatsByPurok({ barangayId } = {}) {
    return [];
  }

  // New method to get detailed population statistics by barangay
  static async getDetailedPopulationStatsByBarangay() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          b.id as barangay_id,
          b.barangay_name,
          COUNT(*) AS total_population,
          COUNT(*) FILTER (WHERE r.sex = 'male') AS total_male,
          COUNT(*) FILTER (WHERE r.sex = 'female') AS total_female,
          COUNT(*) FILTER (
            WHERE r.created_at >= DATE_TRUNC('month', CURRENT_DATE)
              AND r.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          ) AS added_this_month
        FROM residents r
        JOIN barangays b ON b.id = r.barangay_id
        WHERE r.status = 'active'
        GROUP BY b.id, b.barangay_name
        ORDER BY b.barangay_name
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      logger.error(
        "Error getting detailed population stats by barangay:",
        error
      );
      throw error;
    } finally {
      client.release();
    }
  }

  // Puroks removed in v2 — returns empty array
  static async getDetailedHouseholdStatsByPurok({ barangayId } = {}) {
    return [];
  }

  // New method to get detailed household statistics by barangay
  static async getDetailedHouseholdStatsByBarangay() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          b.id as barangay_id,
          b.barangay_name,
          COUNT(DISTINCT h.id) AS total_households,
          COUNT(DISTINCT h.id) FILTER (
            WHERE h.created_at >= DATE_TRUNC('month', CURRENT_DATE)
              AND h.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          ) AS added_this_month
        FROM households h
        JOIN barangays b ON b.id = h.barangay_id
        GROUP BY b.id, b.barangay_name
        ORDER BY b.barangay_name
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      logger.error(
        "Error getting detailed household stats by barangay:",
        error
      );
      throw error;
    } finally {
      client.release();
    }
  }

  // Puroks removed in v2 — returns empty array
  static async getDetailedFamilyStatsByPurok({ barangayId } = {}) {
    return [];
  }

  // New method to get detailed family statistics by barangay
  static async getDetailedFamilyStatsByBarangay() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          b.id as barangay_id,
          b.barangay_name,
          COUNT(DISTINCT f.id) AS total_families,
          COUNT(DISTINCT f.id) FILTER (
            WHERE f.created_at >= DATE_TRUNC('month', CURRENT_DATE)
              AND f.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          ) AS added_this_month
        FROM families f
        JOIN households h ON h.id = f.household_id
        JOIN barangays b ON b.id = h.barangay_id
        GROUP BY b.id, b.barangay_name
        ORDER BY b.barangay_name
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      logger.error("Error getting detailed family stats by barangay:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // New method to get detailed pet statistics by barangay
  static async getDetailedPetStatsByBarangay() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          b.id as barangay_id,
          b.barangay_name,
          COUNT(p.id) as total_pets,
          COUNT(CASE WHEN p.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as added_this_month
        FROM barangays b
        LEFT JOIN residents r ON r.barangay_id = b.id
        LEFT JOIN pets p ON p.owner_id = r.id
        GROUP BY b.id, b.barangay_name
        ORDER BY b.barangay_name
      `;
      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      logger.error("Error getting detailed pet stats by barangay:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Returns unemployed household statistics, optionally filtered by barangayId.
   * @param {Object} options
   * @param {string|number} [options.barangayId]
   * @param {string|number} [options.purokId]
   * @returns {Promise<Object>}
   */
  static async getUnemployedHouseholdStats({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      // Build the full query including both house head and family members
      let query = `
        SELECT 
          COUNT(DISTINCT household_stats.id) as total_households,
          COUNT(DISTINCT CASE WHEN household_stats.unemployed_count > 0 THEN household_stats.id END) as households_with_unemployed,
          SUM(household_stats.unemployed_count) as total_unemployed_residents,
          CASE 
            WHEN COUNT(DISTINCT household_stats.id) > 0 
            THEN COUNT(DISTINCT CASE WHEN household_stats.unemployed_count > 0 THEN household_stats.id END) * 100.0 / COUNT(DISTINCT household_stats.id) 
            ELSE 0 
          END as percentage_households_with_unemployed
        FROM (
          SELECT 
            h.id,
            COUNT(DISTINCT CASE WHEN r.employment_status = 'unemployed' THEN r.id END) as unemployed_count
          FROM households h
          LEFT JOIN (
            -- Include house head
            SELECT h.id as household_id, h.house_head as resident_id
            FROM households h
            WHERE h.house_head IS NOT NULL
            UNION
            -- Include family members
            SELECT h.id as household_id, fm.family_member as resident_id
            FROM households h
            LEFT JOIN families f ON f.household_id = h.id
            LEFT JOIN family_members fm ON fm.family_id = f.id
            WHERE fm.family_member IS NOT NULL
          ) household_residents ON household_residents.household_id = h.id
          LEFT JOIN residents r ON r.id = household_residents.resident_id
      `;

      const whereClauses = [];
      const values = [];
      let paramIndex = 1;

      if (barangayId) {
        whereClauses.push(`h.barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }

      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }

      query += `
          GROUP BY h.id
        ) as household_stats
      `;

      const result = await client.query(query, values);
      console.log("Full query result:", result.rows[0]);

      return (
        result.rows[0] || {
          total_households: 0,
          households_with_unemployed: 0,
          total_unemployed_residents: 0,
          percentage_households_with_unemployed: 0,
        }
      );
    } catch (error) {
      logger.error("Error getting unemployed household stats:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Returns detailed unemployed household data for export, optionally filtered by barangayId and/or purokId.
   * @param {Object} options
   * @param {string|number} [options.barangayId]
   * @param {string|number} [options.purokId]
   * @returns {Promise<Array>}
   */
  static async getUnemployedHouseholdDetails({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          h.id as household_id,
          h.house_number as household_number,
          CONCAT(h.house_number, ' ', COALESCE(h.street, '')) as address,
          b.barangay_name as barangay_name,
          household_stats.unemployed_count,
          household_stats.total_residents,
          household_stats.total_monthly_income,
          r.id as resident_id,
          r.first_name,
          r.last_name,
          r.employment_status,
          r.monthly_income,
          EXTRACT(YEAR FROM AGE(NOW(), r.birthdate))::int as age
        FROM households h
        JOIN barangays b ON b.id = h.barangay_id
        LEFT JOIN (
          -- Include house head
          SELECT h.id as household_id, h.house_head as resident_id
          FROM households h
          WHERE h.house_head IS NOT NULL
          UNION ALL
          -- Include family members
          SELECT h.id as household_id, fm.family_member as resident_id
          FROM households h
          LEFT JOIN families f ON f.household_id = h.id
          LEFT JOIN family_members fm ON fm.family_id = f.id
          WHERE fm.family_member IS NOT NULL
        ) household_residents ON household_residents.household_id = h.id
        LEFT JOIN residents r ON r.id = household_residents.resident_id
        LEFT JOIN (
          SELECT 
            h.id as household_id,
            COUNT(DISTINCT CASE WHEN r.employment_status = 'unemployed' THEN r.id END) as unemployed_count,
            COUNT(DISTINCT r.id) as total_residents,
            COALESCE(SUM(CASE WHEN r.employment_status = 'employed' THEN r.monthly_income ELSE 0 END), 0) as total_monthly_income
          FROM households h
          LEFT JOIN (
            -- Include house head
            SELECT h.id as household_id, h.house_head as resident_id
            FROM households h
            WHERE h.house_head IS NOT NULL
            UNION ALL
            -- Include family members
            SELECT h.id as household_id, fm.family_member as resident_id
            FROM households h
            LEFT JOIN families f ON f.household_id = h.id
            LEFT JOIN family_members fm ON fm.family_id = f.id
            WHERE fm.family_member IS NOT NULL
          ) household_residents ON household_residents.household_id = h.id
          LEFT JOIN residents r ON r.id = household_residents.resident_id
          GROUP BY h.id
        ) household_stats ON household_stats.household_id = h.id
      `;

      const whereClauses = [];
      const values = [];
      let paramIndex = 1;

      if (barangayId) {
        whereClauses.push(`h.barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }

      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }

      query += `
          WHERE household_stats.unemployed_count > 0
          ORDER BY h.house_number, r.last_name, r.first_name
        `;

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error getting unemployed household details:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Returns request statistics, optionally filtered by barangayId.
   * @param {Object} options
   * @param {string|number} [options.barangayId]
   * @returns {Promise<Object>}
   */
  static async getTotalRequestsAndCompleted({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          COUNT(*) AS total_requests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_requests,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_requests,
          COUNT(CASE WHEN type = 'certificate' THEN 1 END) AS certificate_requests,
          COUNT(CASE WHEN type = 'appointment' THEN 1 END) AS appointment_requests,
          COUNT(CASE WHEN status = 'completed' AND type = 'certificate' THEN 1 END) AS completed_certificates,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('year', CURRENT_DATE) THEN 1 END) AS requests_this_year,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('year', CURRENT_DATE) AND status = 'completed' THEN 1 END) AS completed_this_year
        FROM requests
      `;
      const values = [];

      if (barangayId) {
        query += ` WHERE barangay_id = $1`;
        values.push(barangayId);
      }

      const result = await client.query(query, values);

      return {
        total_requests: Number(result.rows[0]?.total_requests || 0),
        completed_requests: Number(result.rows[0]?.completed_requests || 0),
        pending_requests: Number(result.rows[0]?.pending_requests || 0),
        rejected_requests: Number(result.rows[0]?.rejected_requests || 0),
        certificate_requests: Number(result.rows[0]?.certificate_requests || 0),
        appointment_requests: Number(result.rows[0]?.appointment_requests || 0),
        completed_certificates: Number(
          result.rows[0]?.completed_certificates || 0
        ),
        requests_this_year: Number(result.rows[0]?.requests_this_year || 0),
        completed_this_year: Number(result.rows[0]?.completed_this_year || 0),
      };
    } catch (error) {
      logger.error("Error getting total requests:", error);
      throw error;
    } finally {
      client.release();
    }
  }
  static async getBarangayDistribution({ barangayId } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const barangayFilter = barangayId ? `AND r.barangay_id = $1` : '';
      const outerFilter = barangayId ? `WHERE b.id = $1` : '';
      if (barangayId) values.push(barangayId);

      const query = `
        WITH resident_stats AS (
          SELECT
            r.barangay_id,
            COUNT(CASE WHEN r.sex = 'male' THEN 1 END)::int AS male,
            COUNT(CASE WHEN r.sex = 'female' THEN 1 END)::int AS female,
            COUNT(CASE WHEN r.employment_status = 'employed' THEN 1 END)::int AS employed,
            COUNT(CASE WHEN r.employment_status = 'unemployed' THEN 1 END)::int AS unemployed,
            COUNT(CASE WHEN r.employment_status = 'student' THEN 1 END)::int AS student,
            COUNT(CASE WHEN r.employment_status = 'retired' THEN 1 END)::int AS retired,
            COUNT(CASE WHEN r.education_attainment = 'elementary' THEN 1 END)::int AS elementary,
            COUNT(CASE WHEN r.education_attainment = 'high_school_graduate' THEN 1 END)::int AS high_school,
            COUNT(CASE WHEN r.education_attainment = 'college_graduate' THEN 1 END)::int AS college,
            COUNT(CASE WHEN r.education_attainment = 'post_graduate' THEN 1 END)::int AS post_graduate
          FROM residents r
          WHERE r.status = 'active' ${barangayFilter}
          GROUP BY r.barangay_id
        ),
        voter_stats AS (
          SELECT
            r.barangay_id,
            COUNT(CASE WHEN rc.classification_details::text LIKE '%Regular%' THEN 1 END)::int AS regular_voter,
            COUNT(CASE WHEN rc.classification_details::text LIKE '%SK%' THEN 1 END)::int AS sk_voter,
            COUNT(CASE WHEN rc.classification_details::text NOT LIKE '%Regular%' AND rc.classification_details::text NOT LIKE '%SK%' THEN 1 END)::int AS other_voter
          FROM residents r
          JOIN resident_classifications rc ON rc.resident_id = r.id
          WHERE r.status = 'active' AND rc.classification_type = 'Voter' ${barangayFilter}
          GROUP BY r.barangay_id
        )
        SELECT
          b.id AS barangay_id,
          b.barangay_name,
          COALESCE(rs.male, 0) AS male,
          COALESCE(rs.female, 0) AS female,
          COALESCE(rs.employed, 0) AS employed,
          COALESCE(rs.unemployed, 0) AS unemployed,
          COALESCE(rs.student, 0) AS student,
          COALESCE(rs.retired, 0) AS retired,
          COALESCE(rs.elementary, 0) AS elementary,
          COALESCE(rs.high_school, 0) AS high_school,
          COALESCE(rs.college, 0) AS college,
          COALESCE(rs.post_graduate, 0) AS post_graduate,
          COALESCE(vs.regular_voter, 0) AS regular_voter,
          COALESCE(vs.sk_voter, 0) AS sk_voter,
          COALESCE(vs.other_voter, 0) AS other_voter
        FROM barangays b
        LEFT JOIN resident_stats rs ON rs.barangay_id = b.id
        LEFT JOIN voter_stats vs ON vs.barangay_id = b.id
        ${outerFilter}
        ORDER BY b.barangay_name
      `;

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error getting barangay distribution:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllBarangayStats({ municipalityId } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const whereClause = municipalityId ? `WHERE b.municipality_id = $1` : '';
      if (municipalityId) values.push(municipalityId);

      const query = `
        SELECT
          b.id AS barangay_id,
          (SELECT COUNT(*) FROM households h WHERE h.barangay_id = b.id)::int AS households,
          (SELECT COUNT(*) FROM residents r WHERE r.barangay_id = b.id AND r.status = 'active')::int AS residents,
          (SELECT COUNT(*) FROM families f JOIN households h ON h.id = f.household_id WHERE h.barangay_id = b.id)::int AS families,
          (SELECT COUNT(*) FROM pets p JOIN residents r ON r.id = p.owner_id WHERE r.barangay_id = b.id AND r.status = 'active')::int AS pets
        FROM barangays b
        ${whereClause}
        ORDER BY b.barangay_name
      `;
      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all barangay stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Statistics;
