import { pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { GET_ALL_LOGS, GET_BARANGAY_LOGS, GET_LOGS_SPECIFIC } from '../queries/logs.queries.js';

class Logs {
  static async getAllLogs(){
    const client = await pool.connect();
    try {
      const result = await client.query(GET_ALL_LOGS);

      return result.rows;
    } catch(error) {
      logger.error('Error fetching all logs: ', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getBarangayLogs(barangayID){
    const client = await pool.connect();
    try {
      const result = await client.query(GET_BARANGAY_LOGS, [barangayID]);

      return result.rows;
    } catch(error) {
      logger.error('Error fetching barangay logs: ', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getSpecificLogs(table, id){
    const client = await pool.connect();
    try {
      const result = await client.query(GET_LOGS_SPECIFIC, [table, id]);

      return result.rows;
    } catch (error) {
      logger.error('Error fetching logs: ', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

export default Logs;
