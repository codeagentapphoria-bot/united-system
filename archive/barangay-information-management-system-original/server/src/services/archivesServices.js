import { pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/apiError.js';
import fs from 'fs/promises';
import path from 'path';
import {
  INSERT_ARCHIVE,
  UPDATE_ARCHIVE,
  DELETE_ARCHIVE,
  LIST_ARCHIVES,
  ARCHIVE_INFO,
  ARCHIVE_FILE_PATH
} from '../queries/archives.queries.js';

class Archive {
  static async insertArchive({
    barangayId,
    title,
    documentType,
    description,
    author,
    signatory,
    relateResident,
    filePath
  }) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        INSERT_ARCHIVE,
        [
          barangayId,
          title,
          documentType,
          description,
          author,
          signatory,
          relateResident,
          filePath
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error inserting archive:', error);
      throw new ApiError(500, 'Failed to insert archive');
    } finally {
      client.release();
    }
  }

  static async updateArchive({
    archiveId,
    barangayId,
    title,
    documentType,
    description,
    author,
    signatory,
    relateResident,
    filePath
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Get old file path
      const { rows: oldFileRows } = await client.query(ARCHIVE_FILE_PATH, [archiveId]);
      const oldFile = oldFileRows[0]?.file_path;
      // Update archive
      const result = await client.query(
        UPDATE_ARCHIVE,
        [
          archiveId,
          barangayId,
          title,
          documentType,
          description,
          author,
          signatory,
          relateResident,
          filePath
        ]
      );
      // Remove old file if changed
      if (oldFile && oldFile !== filePath) {
        try {
          await fs.unlink(path.resolve(oldFile));
        } catch (error) {
          if (error.code !== 'ENOENT') logger.warn('Failed to delete archive file', error);
        }
      }
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating archive:', error);
      throw new ApiError(500, 'Failed to update archive');
    } finally {
      client.release();
    }
  }

  static async deleteArchive(archiveId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Get file path
      const { rows: fileRows } = await client.query(ARCHIVE_FILE_PATH, [archiveId]);
      const filePath = fileRows[0]?.file_path;
      // Delete archive
      const result = await client.query(DELETE_ARCHIVE, [archiveId]);
      // Remove file
      if (filePath) {
        try {
          await fs.unlink(path.resolve(filePath));
        } catch (error) {
          if (error.code !== 'ENOENT') logger.warn('Failed to delete archive file', error);
        }
      }
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting archive:', error);
      throw new ApiError(500, 'Failed to delete archive');
    } finally {
      client.release();
    }
  }

  static async archiveList({
    barangayId,
    title,
    documentType,
    author,
    search = '',
    page = 1,
    perPage = 10
  } = {}) {
    const client = await pool.connect();
    try {
      if (page < 1 || perPage < 1) {
        throw new Error('Page and perPage must be positive integers');
      }
      let query = `SELECT id AS archive_id, barangay_id, title, document_type, description, author, signatory, relate_resident, file_path, created_at, updated_at FROM archives`;
      const whereClauses = [];
      const values = [];
      let paramIndex = 1;
      if (barangayId) {
        whereClauses.push(`barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }
      if (title) {
        whereClauses.push(`title ILIKE $${paramIndex++}`);
        values.push(`%${title}%`);
      }
      if (documentType) {
        whereClauses.push(`document_type = $${paramIndex++}`);
        values.push(documentType);
      }
      if (author) {
        whereClauses.push(`author ILIKE $${paramIndex++}`);
        values.push(`%${author}%`);
      }
      if (search) {
        whereClauses.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${search}%`);
        paramIndex++;
      }
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
      const offset = (page - 1) * perPage;
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(perPage, offset);
      const result = await client.query(query, values);
      // Count query
      let countQuery = `SELECT COUNT(*) AS total FROM archives`;
      const countWhereClauses = [];
      const countValues = [];
      let countParamIndex = 1;
      if (barangayId) {
        countWhereClauses.push(`barangay_id = $${countParamIndex++}`);
        countValues.push(barangayId);
      }
      if (title) {
        countWhereClauses.push(`title ILIKE $${countParamIndex++}`);
        countValues.push(`%${title}%`);
      }
      if (documentType) {
        countWhereClauses.push(`document_type = $${countParamIndex++}`);
        countValues.push(documentType);
      }
      if (author) {
        countWhereClauses.push(`author ILIKE $${countParamIndex++}`);
        countValues.push(`%${author}%`);
      }
      if (search) {
        countWhereClauses.push(`(title ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`);
        countValues.push(`%${search}%`);
        countParamIndex++;
      }
      if (countWhereClauses.length > 0) {
        countQuery += ' WHERE ' + countWhereClauses.join(' AND ');
      }
      const countResult = await client.query(countQuery, countValues);
      const totalRecords = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(totalRecords / perPage);
      return {
        data: result.rows,
        total: totalRecords,
        totalPages,
        page: Number(page),
        perPage: Number(perPage),
      };
    } catch (error) {
      logger.error('Error fetching archives list:', error);
      throw new ApiError(500, 'Failed to fetch archives list');
    } finally {
      client.release();
    }
  }

  static async archiveInfo(archiveId) {
    const client = await pool.connect();
    try {
      const result = await client.query(ARCHIVE_INFO, [archiveId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching archive info:', error);
      throw new ApiError(500, 'Failed to fetch archive info');
    } finally {
      client.release();
    }
  }
}

export default Archive; 