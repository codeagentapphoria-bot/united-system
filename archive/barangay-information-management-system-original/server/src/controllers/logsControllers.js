import Logs from "../models/Logs.js";
import { ApiError } from "../utils/apiError.js";
import logger from "../utils/logger.js";

export const getAllLogs = async (req, res, next) => {
  try {
    const result = await Logs.getAllLogs();

    return res.status(200).json({
      message: 'Successfully fetch logs',
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error('Controller error in getAllLogs: ', error.message);
    
    // If audit functions don't exist, return empty array instead of error
    if (error.message.includes('function') || error.message.includes('does not exist')) {
      logger.warn('Audit functions not found, returning empty logs');
      return res.status(200).json({
        message: 'No audit logs available',
        data: []
      });
    }
    
    return next(new ApiError(500, 'Internal server error'));
  }
}

export const getBarangayLogs = async (req, res, next) => {
  let barangayId = req.query.barangayId;
  if (!barangayId) barangayId = req.user?.target_id;

  try {
    const result = await Logs.getBarangayLogs(barangayId);

    return res.status(200).json({
      message: 'Successfully fetch barangay logs',
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error('Controller error in getBarangayLogs: ', error.message);
    
    // If audit functions don't exist, return empty array instead of error
    if (error.message.includes('function') || error.message.includes('does not exist')) {
      logger.warn('Audit functions not found, returning empty logs');
      return res.status(200).json({
        message: 'No audit logs available',
        data: []
      });
    }
    
    return next(new ApiError(500, 'Internal server error'));
  }
}

export const getSpecificLogs = async (req, res, next) => {
  const { table, id } = req.query;

  if (!table || !id) {
    return next(new ApiError(400, 'Missing required fields: table and id'));
  }

  try {
    const result = await Logs.getSpecificLogs(table, id);

    return res.status(200).json({
      message: 'Successfully fetch logs',
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error('Controller error in getSpecificLogs: ', error.message);
    
    // If audit functions don't exist, return empty array instead of error
    if (error.message.includes('function') || error.message.includes('does not exist')) {
      logger.warn('Audit functions not found, returning empty logs');
      return res.status(200).json({
        message: 'No audit logs available',
        data: []
      });
    }
    
    return next(new ApiError(500, 'Internal server error'));
  }
}

