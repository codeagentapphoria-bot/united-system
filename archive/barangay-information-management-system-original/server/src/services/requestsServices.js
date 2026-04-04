import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import {
  INSERT_REQUEST,
  UPDATE_REQUEST,
  DELETE_REQUEST,
  VIEW_REQUEST_INFORMATION,
  REQUEST_LIST,
  COUNT_REQUESTS,
} from "../queries/requests.queries.js";

class Requests {
  static async insertRequest({
    residentId,
    fullName,
    address,
    purpose,
    status = 'new'
  }) {
    const client = await pool.connect();
    try {
      const result = await client.query(INSERT_REQUEST, [
        residentId || null,
        fullName,
        address || null,
        purpose,
        status
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("Error inserting request", error);
      throw new ApiError(500, "Failed to create request");
    } finally {
      client.release();
    }
  }

  static async updateRequest({
    requestId,
    residentId,
    fullName,
    address,
    purpose,
    status
  }) {
    const client = await pool.connect();
    try {
      const result = await client.query(UPDATE_REQUEST, [
        requestId,
        residentId || null,
        fullName,
        address || null,
        purpose,
        status
      ]);

      if (result.rows.length === 0) {
        throw new ApiError(404, "Request not found");
      }

      return result.rows[0];
    } catch (error) {
      logger.error("Error updating request", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Failed to update request");
    } finally {
      client.release();
    }
  }

  static async deleteRequest(requestId) {
    const client = await pool.connect();
    try {
      const result = await client.query(DELETE_REQUEST, [requestId]);

      if (result.rows.length === 0) {
        throw new ApiError(404, "Request not found");
      }

      return result.rows[0];
    } catch (error) {
      logger.error("Error deleting request", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Failed to delete request");
    } finally {
      client.release();
    }
  }

  static async requestInfo(requestId) {
    const client = await pool.connect();
    try {
      const result = await client.query(VIEW_REQUEST_INFORMATION, [requestId]);

      if (result.rows.length === 0) {
        throw new ApiError(404, "Request not found");
      }

      return result.rows[0];
    } catch (error) {
      logger.error("Error getting request info", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Failed to get request information");
    } finally {
      client.release();
    }
  }

  static async requestList({
    barangayId,
    status,
    search = "",
    page = 1,
    perPage = 10,
    userTargetType,
    userTargetId,
  }) {
    const client = await pool.connect();
    try {
      // Determine barangayId based on user context
      let targetBarangayId = barangayId;
      if (!targetBarangayId && userTargetType === 'barangay') {
        targetBarangayId = userTargetId;
      }

      const offset = (page - 1) * perPage;

      // Get total count
      const countResult = await client.query(COUNT_REQUESTS, [
        targetBarangayId,
        status,
        search
      ]);

      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const result = await client.query(REQUEST_LIST, [
        targetBarangayId,
        status,
        search,
        perPage,
        offset
      ]);

      return {
        requests: result.rows,
        pagination: {
          total,
          page,
          perPage,
          totalPages: Math.ceil(total / perPage),
          hasNext: page < Math.ceil(total / perPage),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error("Error getting request list", error);
      throw new ApiError(500, "Failed to get request list");
    } finally {
      client.release();
    }
  }
}

export default Requests; 