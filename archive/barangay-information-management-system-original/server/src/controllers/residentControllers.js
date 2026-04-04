import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Resident from "../services/residentServices.js";

export const upsertResident = async (req, res, next) => {
  let {
    barangayId,
    lastName,
    firstName,
    middleName,
    suffix,
    sex,
    civilStatus,
    birthdate,
    birthplace,
    contactNumber,
    email,
    occupation,
    monthlyIncome,
    monthly_income, // Support both naming conventions
    employmentStatus,
    educationAttainment,
    residentStatus,
    indigenousPerson,
    classifications,
  } = req.body;

  // Use the correct field name (prioritize camelCase, fallback to snake_case)
  const actualMonthlyIncome = monthlyIncome !== undefined ? monthlyIncome : monthly_income;

  // If barangayId not supplied, use from token
  if (!barangayId) barangayId = req.user?.target_id;

  // Handle picturePath from file upload
  const picturePath = req.files?.picturePath?.[0]?.path;
  const { residentId } = req.params;

  // Debug logging
  console.log({
    body: req.body,
    file: picturePath,
  });

  // Parse classifications if it came as a string (form-data case)
  if (!Array.isArray(classifications)) {
    try {
      classifications = JSON.parse(classifications || "[]");
    } catch (err) {
      classifications = [];
    }
  }

  if (!barangayId) {
    logger.error("Missing barangayId from user token");
    return next(
      new ApiError(400, "Invalid user token - missing barangay information")
    );
  }

  try {
    let result;
    if (!residentId) {
      result = await Resident.insertResident({
        barangayId,
        lastName,
        firstName,
        middleName,
        suffix,
        sex,
        civilStatus,
        birthdate,
        birthplace,
        contactNumber,
        email,
        occupation,
        monthlyIncome: actualMonthlyIncome,
        employmentStatus,
        educationAttainment,
        residentStatus,
        picturePath,
        indigenousPerson,
        classifications,
      });
    } else {
      result = await Resident.updateResident({
        residentId,
        barangayId,
        lastName,
        firstName,
        middleName,
        suffix,
        sex,
        civilStatus,
        birthdate,
        birthplace,
        contactNumber,
        email,
        occupation,
        monthlyIncome: actualMonthlyIncome,
        employmentStatus,
        educationAttainment,
        residentStatus,
        picturePath,
        indigenousPerson,
        classifications,
      });
    }

    return res.status(200).json({
      message: "Successfully upserted resident",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in upsertResident: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const deleteResident = async (req, res, next) => {
  const { residentId } = req.params;
  try {
    const checkResult = await Resident.residentInfo(residentId);

    if (!checkResult) {
      return next(
        new ApiError(404, `Resident with ID: ${residentId} does not exist`)
      );
    }

    const result = await Resident.deleteResident(residentId);

    return res.status(200).json({
      message: "Successfully deleted resident",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in deleteResident: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const residentList = async (req, res, next) => {
  let { barangayId, purokId, classificationType, search, page, perPage } =
    req.query;

  // For municipality users, don't filter by barangayId unless explicitly provided
  // This allows them to see all residents across all barangays
  if (!barangayId && req.user?.target_type === "barangay") {
    barangayId = req.user?.target_id;
  }

  try {
    const result = await Resident.residentList({
      barangayId,
      purokId,
      classificationType,
      search,
      page,
      perPage,
      userTargetType: req.user?.target_type,
      userTargetId: req.user?.target_id,
    });

    return res.status(200).json({
      message: "Successfully fetch resident list",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in residentList", error.message);

    return next(new ApiError(500, "Internal server error"));
  }
};

export const residentInfo = async (req, res, next) => {
  const { residentId } = req.params;
  try {
    const result = await Resident.residentInfo(residentId);

    return res.status(200).json({
      message: "Successfully fetch resident information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in residentInfo: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const residentInfoForQR = async (req, res, next) => {
  const { residentId } = req.params;
  try {
    const result = await Resident.residentInfo(residentId);

    // For QR code searches, return 404 if resident not found
    if (!result) {
      return next(new ApiError(404, "Resident not found"));
    }

    return res.status(200).json({
      message: "Successfully fetch resident information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in residentInfoForQR: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const publicResidentInfoForQR = async (req, res, next) => {
  const { residentId } = req.params;
  
  try {
    const result = await Resident.publicResidentInfo(residentId);

    // For QR code searches, return 404 if resident not found
    if (!result) {
      return next(new ApiError(404, "Resident not found"));
    }

    return res.status(200).json({
      message: "Successfully fetch public resident information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in publicResidentInfoForQR: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const insertClassification = async (req, res, next) => {
  const { classificationType, classificationDetails } = req.body;
  try {
    if (!classificationType) {
      return next(new ApiError(400, "Classification type is required"));
    }

    const result = await Resident.insertClassification({
      classificationType,
      classificationDetails,
    });

    return res.status(201).json({
      message: "Successfully created classification",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in insertClassification: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const classificationList = async (req, res, next) => {
  try {
    const result = await Resident.classificationList();

    return res.status(200).json({
      message: "Successfully fetch classification list",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in classification list: ", error.message);

    return next(new ApiError(500, "Internal server error"));
  }
};

export const updateClassification = async (req, res, next) => {
  try {
    const { classificationId } = req.params;
    const { classificationType, classificationDetails } = req.body;

    const result = await Resident.updateClassification({
      classificationId,
      classificationType,
      classificationDetails,
    });

    return res.status(200).json({
      message: "Successfully updated classification",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in update classification: ", error.message);

    return next(new ApiError(500, "Internal server error"));
  }
};

// Classification Types Controllers
export const getClassificationTypes = async (req, res, next) => {
  try {
    const targetId = req.user.target_id;
    const targetType = req.user.target_type;
    
    let municipalityId;
    
    if (targetType === 'municipality') {
      // For municipality users, target_id is already the municipality_id
      municipalityId = targetId;
    } else if (targetType === 'barangay') {
      // For barangay users, get municipality_id from barangay
      const barangay = await Resident.getBarangayById(targetId);
      if (!barangay) {
        return next(new ApiError(404, "Barangay not found"));
      }
      municipalityId = barangay.municipality_id;
    } else {
      return next(new ApiError(400, "Invalid user target type"));
    }
    
    const result = await Resident.getClassificationTypes(municipalityId);

    return res.status(200).json({
      message: "Successfully fetched classification types",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in get classification types: ", error.message);

    return next(new ApiError(500, "Internal server error"));
  }
};

export const getClassificationTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const targetId = req.user.target_id;
    const targetType = req.user.target_type;
    
    let municipalityId;
    
    if (targetType === 'municipality') {
      // For municipality users, target_id is already the municipality_id
      municipalityId = targetId;
    } else if (targetType === 'barangay') {
      // For barangay users, get municipality_id from barangay
      const barangay = await Resident.getBarangayById(targetId);
      if (!barangay) {
        return next(new ApiError(404, "Barangay not found"));
      }
      municipalityId = barangay.municipality_id;
    } else {
      return next(new ApiError(400, "Invalid user target type"));
    }
    
    const result = await Resident.getClassificationTypeById(id, municipalityId);
    
    if (!result) {
      return next(new ApiError(404, "Classification type not found"));
    }

    return res.status(200).json({
      message: "Successfully fetched classification type",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in get classification type by id: ", error.message);

    return next(new ApiError(500, "Internal server error"));
  }
};

export const createClassificationType = async (req, res, next) => {
  try {
    const targetId = req.user.target_id;
    const targetType = req.user.target_type;
    const { name, description, color, details } = req.body;

    console.log('Creating classification type with data:', { targetId, targetType, name, description, color, details });

    if (!targetId) {
      return next(new ApiError(400, "Target ID is required"));
    }

    if (!name) {
      return next(new ApiError(400, "Classification name is required"));
    }

    let municipalityId;
    
    if (targetType === 'municipality') {
      // For municipality users, target_id is already the municipality_id
      municipalityId = targetId;
    } else if (targetType === 'barangay') {
      // For barangay users, get municipality_id from barangay
      const barangay = await Resident.getBarangayById(targetId);
      if (!barangay) {
        return next(new ApiError(404, "Barangay not found"));
      }
      municipalityId = barangay.municipality_id;
    } else {
      return next(new ApiError(400, "Invalid user target type"));
    }

    const result = await Resident.insertClassificationType({
      municipalityId,
      name,
      description,
      color,
      details,
    });

    return res.status(201).json({
      message: "Successfully created classification type",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in create classification type: ", error.message);

    if (error.message === "Classification type already exists") {
      return next(new ApiError(409, "Classification type already exists"));
    }

    return next(new ApiError(500, "Internal server error"));
  }
};

export const updateClassificationType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const targetId = req.user.target_id;
    const targetType = req.user.target_type;
    const { name, description, color, details } = req.body;

    console.log('Updating classification type with data:', { id, targetId, targetType, name, description, color, details });

    if (!targetId) {
      return next(new ApiError(400, "Target ID is required"));
    }

    if (!name) {
      return next(new ApiError(400, "Classification name is required"));
    }

    let municipalityId;
    
    if (targetType === 'municipality') {
      // For municipality users, target_id is already the municipality_id
      municipalityId = targetId;
    } else if (targetType === 'barangay') {
      // For barangay users, get municipality_id from barangay
      const barangay = await Resident.getBarangayById(targetId);
      if (!barangay) {
        return next(new ApiError(404, "Barangay not found"));
      }
      municipalityId = barangay.municipality_id;
    } else {
      return next(new ApiError(400, "Invalid user target type"));
    }

    const result = await Resident.updateClassificationType({
      id,
      municipalityId,
      name,
      description,
      color,
      details,
    });

    if (!result) {
      return next(new ApiError(404, "Classification type not found"));
    }

    return res.status(200).json({
      message: "Successfully updated classification type",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in update classification type: ", error.message);

    if (error.message === "Classification type already exists") {
      return next(new ApiError(409, "Classification type already exists"));
    }

    return next(new ApiError(500, "Internal server error"));
  }
};

export const deleteClassificationType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const targetId = req.user.target_id;
    const targetType = req.user.target_type;

    if (!targetId) {
      return next(new ApiError(400, "Target ID is required"));
    }

    let municipalityId;
    
    if (targetType === 'municipality') {
      // For municipality users, target_id is already the municipality_id
      municipalityId = targetId;
    } else if (targetType === 'barangay') {
      // For barangay users, get municipality_id from barangay
      const barangay = await Resident.getBarangayById(targetId);
      if (!barangay) {
        return next(new ApiError(404, "Barangay not found"));
      }
      municipalityId = barangay.municipality_id;
    } else {
      return next(new ApiError(400, "Invalid user target type"));
    }

    const result = await Resident.deleteClassificationType(id, municipalityId);

    if (!result) {
      return next(new ApiError(404, "Classification type not found"));
    }

    return res.status(200).json({
      message: "Successfully deleted classification type",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in delete classification type: ", error.message);

    return next(new ApiError(500, "Internal server error"));
  }
};

export const deleteClassification = async (req, res, next) => {
  const { classificationId } = req.params;

  try {
    const result = await Resident.deleteClassification(classificationId);

    return res.status(200).json({
      message: "Successfully deleted classification",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in deleteClassification: ", error.message);

    return next(new ApiError(500, "Internal server error"));
  }
};

export const syncResident = async (req, res, next) => {
  let {
    id,
    barangayId,
    lastName,
    firstName,
    middleName,
    suffix,
    sex,
    civilStatus,
    birthdate,
    birthplace,
    contactNumber,
    email,
    occupation,
    monthlyIncome,
    employmentStatus,
    educationAttainment,
    residentStatus,
    indigenousPerson,
    picturePath, // Add picturePath to destructuring
  } = req.body;

  // If barangayId not supplied, use from token
  if (!barangayId) barangayId = req.user?.target_id;

  // Input validation
  if (contactNumber && contactNumber.length > 50) {
    logger.warn(`Contact number too long: ${contactNumber.length} characters. Truncating to 50 characters.`);
    contactNumber = contactNumber.substring(0, 50);
  }

  if (residentStatus && residentStatus.length > 20) {
    logger.warn(`Resident status too long: ${residentStatus.length} characters. Truncating to 20 characters.`);
    residentStatus = residentStatus.substring(0, 20);
  }

  // Handle picturePath from file upload OR JSON payload
  const finalPicturePath = picturePath || req.files?.picturePath?.[0]?.path;

  // Debug logging
  console.log({
    body: req.body,
    file: finalPicturePath,
    picturePathFromBody: picturePath,
    picturePathFromFile: req.files?.picturePath?.[0]?.path,
  });

  if (!barangayId) {
    logger.error("Missing barangayId from user token");
    return next(
      new ApiError(400, "Invalid user token - missing barangay information")
    );
  }

  if (!id) {
    return next(new ApiError(400, "Resident ID is required for sync"));
  }

  try {
    const result = await Resident.syncResident({
      id,
      barangayId,
      lastName,
      firstName,
      middleName,
      suffix,
      sex,
      civilStatus,
      birthdate,
      birthplace,
      contactNumber,
      email,
      occupation,
      monthlyIncome,
      employmentStatus,
      educationAttainment,
      residentStatus,
      picturePath: finalPicturePath, // Use the final picture path
      indigenousPerson,
    });

    return res.status(200).json({
      message: "Successfully synced resident",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in syncResident: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const syncClassification = async (req, res, next) => {
  const { residentId, classificationType, classificationDetails } = req.body;

  if (!residentId) {
    return next(new ApiError(400, "Resident ID is required"));
  }

  if (!classificationType) {
    return next(new ApiError(400, "Classification type is required"));
  }

  try {
    const result = await Resident.syncClassification({
      residentId,
      classificationType,
      classificationDetails,
    });

    return res.status(200).json({
      message: "Successfully synced classification",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in syncClassification: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};