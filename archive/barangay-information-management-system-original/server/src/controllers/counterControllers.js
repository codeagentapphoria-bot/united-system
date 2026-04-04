import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Counter from "../services/counterServices.js";

export const getPrefix = async (req, res, next) => {
  try {
    const prefix = await Counter.getCurrentYearPrefix();

    return res.status(200).json({
      success: true,
      data: { prefix: prefix.trim() },
      message: "Prefix retrieved successfully",
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in getPrefix", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const updatePrefix = async (req, res, next) => {
  const { prefix } = req.body;

  if (!prefix) {
    logger.error("Prefix is missing from request body");
    return next(new ApiError(400, "Prefix is required"));
  }

  if (typeof prefix !== "string" || prefix.trim().length === 0) {
    logger.error("Invalid prefix format");
    return next(new ApiError(400, "Prefix must be a non-empty string"));
  }

  try {
    const result = await Counter.updatePrefix(prefix.trim());

    return res.status(200).json({
      success: true,
      data: { prefix: result.prefix.trim() },
      message: "Prefix updated successfully",
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in updatePrefix", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};
