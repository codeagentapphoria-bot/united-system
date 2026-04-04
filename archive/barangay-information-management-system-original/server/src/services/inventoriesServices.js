import { pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/apiError.js';
import fs from 'fs/promises';
import path from 'path';
import {
  INSERT_INVENTORY,
  UPDATE_INVENTORY,
  DELETE_INVENTORY,
  LIST_INVENTORIES,
  INVENTORY_INFO,
  INVENTORY_FILE_PATH
} from '../queries/inventories.queries.js';

class Inventory {
  static async insertInventory({
    barangayId,
    itemName,
    itemType,
    description,
    sponsors,
    quantity,
    unit,
    filePath
  }) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        INSERT_INVENTORY,
        [
          barangayId,
          itemName,
          itemType,
          description,
          sponsors,
          quantity,
          unit,
          filePath
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error inserting inventory:', error);
      throw new ApiError(500, 'Failed to insert inventory');
    } finally {
      client.release();
    }
  }

  static async updateInventory({
    inventoryId,
    barangayId,
    itemName,
    itemType,
    description,
    sponsors,
    quantity,
    unit,
    filePath
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Get old file path
      const { rows: oldFileRows } = await client.query(INVENTORY_FILE_PATH, [inventoryId]);
      const oldFile = oldFileRows[0]?.file_path;
      // Update inventory
      const result = await client.query(
        UPDATE_INVENTORY,
        [
          inventoryId,
          barangayId,
          itemName,
          itemType,
          description,
          sponsors,
          quantity,
          unit,
          filePath
        ]
      );
      // Remove old file if changed
      if (oldFile && oldFile !== filePath) {
        try {
          await fs.unlink(path.resolve(oldFile));
        } catch (error) {
          if (error.code !== 'ENOENT') logger.warn('Failed to delete inventory file', error);
        }
      }
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating inventory:', error);
      throw new ApiError(500, 'Failed to update inventory');
    } finally {
      client.release();
    }
  }

  static async deleteInventory(inventoryId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Get file path
      const { rows: fileRows } = await client.query(INVENTORY_FILE_PATH, [inventoryId]);
      const filePath = fileRows[0]?.file_path;
      // Delete inventory
      const result = await client.query(DELETE_INVENTORY, [inventoryId]);
      // Remove file
      if (filePath) {
        try {
          await fs.unlink(path.resolve(filePath));
        } catch (error) {
          if (error.code !== 'ENOENT') logger.warn('Failed to delete inventory file', error);
        }
      }
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting inventory:', error);
      throw new ApiError(500, 'Failed to delete inventory');
    } finally {
      client.release();
    }
  }

  static async inventoryList({
    barangayId,
    itemType,
    search = '',
    page = 1,
    perPage = 10
  } = {}) {
    const client = await pool.connect();
    try {
      if (page < 1 || perPage < 1) {
        throw new Error('Page and perPage must be positive integers');
      }
      let query = `SELECT id AS inventory_id, barangay_id, item_name, item_type, description, sponsors, quantity, unit, file_path, created_at, updated_at FROM inventories`;
      const whereClauses = [];
      const values = [];
      let paramIndex = 1;
      if (barangayId) {
        whereClauses.push(`barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }
      if (itemType) {
        whereClauses.push(`item_type = $${paramIndex++}`);
        values.push(itemType);
      }
      if (search) {
        whereClauses.push(`(item_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
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
      let countQuery = `SELECT COUNT(*) AS total FROM inventories`;
      const countWhereClauses = [];
      const countValues = [];
      let countParamIndex = 1;
      if (barangayId) {
        countWhereClauses.push(`barangay_id = $${countParamIndex++}`);
        countValues.push(barangayId);
      }
      if (itemType) {
        countWhereClauses.push(`item_type = $${countParamIndex++}`);
        countValues.push(itemType);
      }
      if (search) {
        countWhereClauses.push(`(item_name ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`);
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
        pagination: {
          page: Number(page),
          perPage: Number(perPage),
          totalRecords,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error fetching inventories list:', error);
      throw new ApiError(500, 'Failed to fetch inventories list');
    } finally {
      client.release();
    }
  }

  static async inventoryInfo(inventoryId) {
    const client = await pool.connect();
    try {
      const result = await client.query(INVENTORY_INFO, [inventoryId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching inventory info:', error);
      throw new ApiError(500, 'Failed to fetch inventory info');
    } finally {
      client.release();
    }
  }
}

export default Inventory; 