import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import {
  GET_PREFIX,
  UPDATE_PREFIX,
  INSERT_OR_UPDATE_PREFIX,
} from "../queries/counter.queries.js";

class Counter {
  static async getPrefix() {
    const client = await pool.connect();
    try {
      const result = await client.query(GET_PREFIX);
      return result.rows[0]?.prefix || "DFLT";
    } catch (error) {
      logger.error("Error fetching prefix", error);
      throw new ApiError(500, "Failed to fetch prefix");
    } finally {
      client.release();
    }
  }

  static async updatePrefix(newPrefix, municipalityId, year = null) {
    const client = await pool.connect();
    try {
      // If no year provided, use current year
      const currentYear = year || new Date().getFullYear();

      // Validate prefix length (should be 4 characters)
      if (newPrefix.length > 4) {
        throw new ApiError(400, "Prefix must be 4 characters or less");
      }

      // Pad prefix to 4 characters if needed
      const paddedPrefix = newPrefix.padEnd(4, " ").substring(0, 4);

      const result = await client.query(INSERT_OR_UPDATE_PREFIX, [
        currentYear,
        paddedPrefix,
        municipalityId,
      ]);

      logger.info(
        `Prefix updated to: ${paddedPrefix} for year: ${currentYear}`
      );
      return result.rows[0];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error updating prefix", error);
      throw new ApiError(500, "Failed to update prefix");
    } finally {
      client.release();
    }
  }

  static async getCurrentYearPrefix() {
    const client = await pool.connect();
    try {
      const currentYear = new Date().getFullYear();
      const result = await client.query(
        "SELECT prefix FROM resident_counters WHERE year = $1",
        [currentYear]
      );
      return result.rows[0]?.prefix || "DFLT";
    } catch (error) {
      logger.error("Error fetching current year prefix", error);
      throw new ApiError(500, "Failed to fetch current year prefix");
    } finally {
      client.release();
    }
  }
}

export default Counter;
