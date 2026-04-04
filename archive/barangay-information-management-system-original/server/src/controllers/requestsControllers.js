import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Requests from "../services/requestsServices.js";

export const upsertRequest = async (req, res, next) => {
  let {
    residentId,
    fullName,
    address,
    purpose,
    status
  } = req.body;

  const { requestId } = req.params;

  // Debug logging
  console.log({
    body: req.body,
    requestId
  });

  if (!fullName) {
    return next(new ApiError(400, "Full name is required"));
  }

  if (!purpose) {
    return next(new ApiError(400, "Purpose is required"));
  }

  try {
    let result;
    if (!requestId) {
      result = await Requests.insertRequest({
        residentId,
        fullName,
        address,
        purpose,
        status
      });
    } else {
      result = await Requests.updateRequest({
        requestId,
        residentId,
        fullName,
        address,
        purpose,
        status
      });
    }

    res.status(200).json({
      success: true,
      message: !requestId ? "Request created successfully" : "Request updated successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRequest = async (req, res, next) => {
  const { requestId } = req.params;

  if (!requestId) {
    return next(new ApiError(400, "Request ID is required"));
  }

  try {
    const result = await Requests.deleteRequest(requestId);

    res.status(200).json({
      success: true,
      message: "Request deleted successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const requestList = async (req, res, next) => {
  const {
    barangayId,
    status,
    search,
    page = 1,
    perPage = 10
  } = req.query;

  try {
    const result = await Requests.requestList({
      barangayId: barangayId ? parseInt(barangayId) : null,
      status,
      search,
      page: parseInt(page),
      perPage: parseInt(perPage),
      userTargetType: req.user?.target_type,
      userTargetId: req.user?.target_id
    });

    res.status(200).json({
      success: true,
      message: "Requests retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const requestInfo = async (req, res, next) => {
  const { requestId } = req.params;

  if (!requestId) {
    return next(new ApiError(400, "Request ID is required"));
  }

  try {
    const result = await Requests.requestInfo(requestId);

    res.status(200).json({
      success: true,
      message: "Request information retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
}; 