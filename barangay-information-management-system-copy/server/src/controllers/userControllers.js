import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import User from "../services/userServices.js";
import { sendEmail } from "../utils/email.js";
import process from "process";

export const checkUserConflicts = async (req, res, next) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return next(new ApiError(400, "Email is required"));
    }
    
    const existingUser = await User.findByEmail(email);
    
    return res.status(200).json({
      message: "Conflict check completed",
      data: {
        hasConflicts: !!existingUser,
        conflicts: existingUser ? [{
          field: "email",
          message: `Email "${email}" is already in use`,
          existingId: existingUser.id
        }] : []
      }
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in checkUserConflicts: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const upsertUser = async (req, res, next) => {
  let { targetType, targetId, fullname, email, password, role, removePicture } = req.body;
  const { userId } = req.params;

  // Treat the string "undefined" (from FormData serialization) as missing
  if (targetType === 'undefined') targetType = undefined;
  if (targetId === 'undefined') targetId = undefined;
  if (role === 'undefined') role = undefined;

  // For new users (POST), fall back to the authenticated user's context if not provided.
  // For updates (PUT), the service loads the existing values from the DB — don't overwrite here.
  if (!userId) {
    if (!targetType && req.user) targetType = req.user.target_type;
    if (!targetId && req.user) targetId = req.user.target_id;
  }

  // Safely extract picturePath from uploaded files
  let picturePath = null;
  if (req.files && req.files.picturePath && req.files.picturePath[0]) {
    picturePath = req.files.picturePath[0].path;
  }

  // Handle picture removal flag
  if (removePicture === "true" || removePicture === true) {
    picturePath = null; // Set to null to remove the picture
  }

  try {
    const checkResult = await User.findByEmail(email);

    if (!userId) {
      if (checkResult) {
        return next(
          new ApiError(409, "Email is already in used, try another email...")
        );
      }
    } else {
      if (checkResult && checkResult.id !== parseInt(userId, 10)) {
        return next(new ApiError(409, "Email already exists for another user"));
      }
    }

    let result;
    if (!userId) {
      result = await User.insertUser({
        targetType,
        targetId,
        fullname,
        email,
        password,
        role,
        picturePath,
      });
    } else {
      result = await User.updateUser({
        userId,
        targetType,
        targetId,
        fullname,
        email,
        password,
        role,
        picturePath,
      });
    }

    return res.status(200).json({
      message: "User successfully upserted",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint === 'bims_users_email_key') {
        logger.error("Duplicate email error:", error.message);
        return next(new ApiError(409, `Email "${email}" is already in use. Please use a different email address.`));
      }
    }
    
    logger.error("Controller error in upsertUser:", error.message);
    logger.error("Controller error stack:", error.stack);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const deleteUser = async (req, res, next) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      logger.error("Missing userId in deleteUser");
      return next(new ApiError(400, "User ID is required"));
    }

    const result = await User.deleteUser(userId);

    return res.status(200).json({
      message: "User successfully deleted",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in deleteUser:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const userList = async (req, res, next) => {
  const { targetId } = req.params;
  const { search, page, perPage } = req.query;

  if (!targetId) targetId = req.user.target_id;
  try {
    const result = await User.userList({ targetId, search, page, perPage });

    return res.status(200).json({
      message: "Successfully fetch users list",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in userList:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const userInfo = async (req, res, next) => {
  const { userId } = req.params;
  try {
    if (!userId) {
      logger.error("Missing required field userId");
      return next(ApiError(400, "Missing required field userID"));
    }

    const result = await User.userInfo(userId);

    return res.status(200).json({
      message: "Successfully fetch user Information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in userInfo:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const sendSetupEmail = async (req, res, next) => {
  try {
    const { to, subject, body, html, from } = req.body;
    
    // Validate required fields
    if (!to || !subject || (!body && !html)) {
      return res
        .status(400)
        .json({ 
          message: "Missing required email fields.",
          details: "to, subject, and either body or html are required"
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res
        .status(400)
        .json({ 
          message: "Invalid email address format.",
          details: "Please provide a valid email address"
        });
    }
    
    logger.info(`Attempting to send setup email to: ${to}`);
    
    const result = await sendEmail({
      to,
      subject,
      text: body,
      html,
      from: from || process.env.SMTP_FROM,
    });
    
    logger.info(`Setup email sent successfully to: ${to}, Message ID: ${result.messageId}`);
    
    return res.status(200).json({ 
      message: "Setup email sent successfully.",
      messageId: result.messageId,
      recipient: to
    });
  } catch (error) {
    logger.error("Setup email sending error:", error.message);
    
    // Provide specific error messages based on error type
    if (error.message.includes('Invalid login')) {
      return next(new ApiError(500, "SMTP authentication failed. Please check email credentials."));
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return next(new ApiError(500, "Unable to connect to email server. Please check network connection."));
    } else if (error.message.includes('Invalid email')) {
      return next(new ApiError(400, "Invalid email address format."));
    } else if (error.message.includes('Gmail SMTP credentials')) {
      return next(new ApiError(500, "Email service configuration error. Please contact administrator."));
    }
    
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(500, `Email sending failed: ${error.message}`));
  }
};

export const getUserByEmail = async (req, res, next) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: "Missing required field: email" });
  }
  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User found",
      data: {
        id: user.id,
        email: user.email,
        password: user.password,
        role: user.role,
        target_type: user.target_type,
        target_id: user.target_id,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUsersByTarget = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.params;

    if (!targetType || !targetId) {
      return res.status(400).json({
        message: "Missing required fields: targetType and targetId",
      });
    }

    const users = await User.getUsersByTarget(targetType, targetId);

    return res.status(200).json({
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    logger.error("Controller error in getUsersByTarget:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const getAdminUsers = async (req, res, next) => {
  try {
    const users = await User.getAdminUsers();

    return res.status(200).json({
      message: "Admin users fetched successfully",
      data: users,
    });
  } catch (error) {
    logger.error("Controller error in getAdminUsers:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};
