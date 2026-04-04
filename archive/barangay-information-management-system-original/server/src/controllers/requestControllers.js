import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Request from "../services/requestServices.js";

// Submit a certificate request (public)
export const submitCertificateRequest = async (req, res, next) => {
  try {
    const {
      residentId,
      fullName,
      contactNumber,
      email,
      address,
      barangayId,
      certificateType,
      urgency,
      purpose,
      requirements = [],
    } = req.body;

    // Validate required fields
    if (!residentId || !barangayId || !certificateType || !purpose) {
      throw new ApiError(400, "Missing required fields");
    }

    const requestData = {
      residentId,
      fullName: null, // Not required for certificate requests
      contactNumber: null, // Not required for certificate requests
      email: null, // Not required for certificate requests
      address: null, // Not required for certificate requests
      barangayId,
      certificateType,
      urgency: urgency || "normal",
      purpose,
      requirements,
      type: "certificate",
      status: "pending",
    };

    const result = await Request.createRequest(requestData);

    res.status(201).json({
      success: true,
      message: "Certificate request submitted successfully",
      data: {
        ...result,
        tracking_id: result.uuid, // Use UUID for public tracking
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in submitCertificateRequest:", error);
    next(new ApiError(500, "Failed to submit certificate request"));
  }
};

// Submit an appointment request (public)
export const submitAppointmentRequest = async (req, res, next) => {
  try {
    const {
      residentId,
      fullName,
      contactNumber,
      email,
      address,
      barangayId,
      appointmentWith,
      appointmentDate,
      purpose,
    } = req.body;

    // Validate required fields
    if (
      !fullName ||
      !address ||
      !barangayId ||
      !appointmentWith ||
      !appointmentDate ||
      !purpose
    ) {
      throw new ApiError(400, "Missing required fields");
    }

    const requestData = {
      residentId,
      fullName,
      contactNumber,
      email,
      address,
      barangayId,
      appointmentWith,
      appointmentDate,
      purpose,
      type: "appointment",
      status: "pending",
    };

    const result = await Request.createRequest(requestData);

    res.status(201).json({
      success: true,
      message: "Appointment request submitted successfully",
      data: {
        ...result,
        tracking_id: result.uuid, // Use UUID for public tracking
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in submitAppointmentRequest:", error);
    next(new ApiError(500, "Failed to submit appointment request"));
  }
};

// Get request by ID (public)
export const getRequestById = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      throw new ApiError(400, "Request ID is required");
    }

    const result = await Request.getRequestById(requestId);

    if (!result) {
      throw new ApiError(404, "Request not found");
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in getRequestById:", error);
    next(new ApiError(500, "Failed to get request"));
  }
};

// Track request by UUID (public) - Enhanced version with certificate type logic
export const trackRequestById = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      throw new ApiError(400, "Request tracking ID is required");
    }

    // Use UUID for public tracking
    const result = await Request.getRequestByUuid(requestId);

    if (!result) {
      throw new ApiError(404, "Request not found");
    }

    // Handle certificate type logic
    let requestType = result.type;
    let certificateType = result.certificate_type;
    
    // If certificate_type is null and type is appointment, set certificateType to "appointment"
    if (!certificateType && result.type === "appointment") {
      certificateType = "appointment";
    }
    
    // If certificate_type is null and type is certificate, set a default
    if (!certificateType && result.type === "certificate") {
      certificateType = "barangay-clearance"; // Default certificate type
    }

    // Create enhanced response with tracking information
    // Note: We exclude the internal serial id for security
    const trackingData = {
      uuid: result.uuid,
      resident_id: result.resident_id,
      full_name: result.full_name,
      contact_number: result.contact_number,
      email: result.email,
      address: result.address,
      barangay_id: result.barangay_id,
      type: requestType,
      status: result.status,
      certificate_type: certificateType,
      urgency: result.urgency,
      purpose: result.purpose,
      requirements: result.requirements,
      appointment_with: result.appointment_with,
      appointment_date: result.appointment_date,
      notes: result.notes,
      tracking_id: result.uuid, // Use UUID as tracking ID
      submitted_date: result.created_at,
      last_updated: result.updated_at,
      resident_info: result.resident_info,
    };

    res.status(200).json({
      success: true,
      message: "Request tracking information retrieved successfully",
      data: trackingData,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in trackRequestById:", error);
    next(new ApiError(500, "Failed to track request"));
  }
};

// Get my requests (authenticated)
export const getMyRequests = async (req, res, next) => {
  try {
    const { barangayId } = req.query;
    const targetBarangayId = barangayId || req.user?.target_id;

    if (!targetBarangayId) {
      throw new ApiError(400, "Barangay ID is required");
    }

    const result = await Request.getRequestsByBarangay(targetBarangayId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in getMyRequests:", error);
    next(new ApiError(500, "Failed to get requests"));
  }
};

// Update request status (authenticated)
export const updateRequestStatus = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status, notes } = req.body;

    if (!requestId || !status) {
      throw new ApiError(400, "Request ID and status are required");
    }

    const validStatuses = ["pending", "approved", "rejected", "completed"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid status");
    }

    const result = await Request.updateRequestStatus(requestId, status, notes);

    res.status(200).json({
      success: true,
      message: "Request status updated successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in updateRequestStatus:", error);
    next(new ApiError(500, "Failed to update request status"));
  }
};

// Get all requests (authenticated - for admin)
export const getAllRequests = async (req, res, next) => {
  try {
    const { barangayId, status, type, page = 1, perPage = 10 } = req.query;
    const targetBarangayId = barangayId || req.user?.target_id;

    if (!targetBarangayId) {
      throw new ApiError(400, "Barangay ID is required");
    }

    const result = await Request.getAllRequests({
      barangayId: targetBarangayId,
      status,
      type,
      page: parseInt(page),
      perPage: parseInt(perPage),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in getAllRequests:", error);
    next(new ApiError(500, "Failed to get requests"));
  }
};
