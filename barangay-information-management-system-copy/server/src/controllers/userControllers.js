import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import User from "../services/userServices.js";
import { sendEmail } from "../utils/email.js";
import { pool } from "../config/db.js";
import process from "process";

const asId = (value) => Number.parseInt(value, 10);

const getUserTarget = async (userId) => {
  const { rows } = await pool.query(
    "SELECT target_type, target_id FROM bims_users WHERE id = $1",
    [userId]
  );
  if (rows.length === 0) throw new ApiError(404, "User not found");
  return rows[0];
};

const assertCanManageUserTarget = async (actor, targetType, targetId) => {
  if (!actor) throw new ApiError(401, "Not authorized");
  if (actor.role !== "admin") throw new ApiError(403, "Only admins can manage users");

  const normalizedTargetId = asId(targetId);
  if (!Number.isInteger(normalizedTargetId)) throw new ApiError(400, "Invalid targetId");

  if (actor.target_type === "barangay") {
    if (targetType !== "barangay" || normalizedTargetId !== asId(actor.target_id)) {
      throw new ApiError(403, "Cannot manage users outside your barangay");
    }
    return;
  }

  if (actor.target_type === "municipality") {
    if (targetType === "municipality") {
      if (normalizedTargetId !== asId(actor.target_id)) {
        throw new ApiError(403, "Cannot manage another municipality");
      }
      return;
    }

    if (targetType === "barangay") {
      const { rowCount } = await pool.query(
        "SELECT 1 FROM barangays WHERE id = $1 AND municipality_id = $2",
        [normalizedTargetId, actor.target_id]
      );
      if (rowCount === 0) throw new ApiError(403, "Cannot manage users outside your municipality");
      return;
    }
  }

  throw new ApiError(403, "Forbidden");
};

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

  if (!targetType || !targetId || !fullname || !email || !role) {
    return next(new ApiError(400, "targetType, targetId, fullname, email, and role are required"));
  }

  if (!['municipality', 'barangay'].includes(targetType)) {
    return next(new ApiError(400, "targetType must be municipality or barangay"));
  }

  if (!['admin', 'staff'].includes(role)) {
    return next(new ApiError(400, "role must be admin or staff"));
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
    if (userId) {
      const currentTarget = await getUserTarget(userId);
      await assertCanManageUserTarget(req.user, currentTarget.target_type, currentTarget.target_id);
    }
    await assertCanManageUserTarget(req.user, targetType, targetId);

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

    const currentTarget = await getUserTarget(userId);
    await assertCanManageUserTarget(req.user, currentTarget.target_type, currentTarget.target_id);

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

  try {
    if (req.user.target_type === "barangay" || asId(targetId) === asId(req.user.target_id)) {
      await assertCanManageUserTarget(req.user, req.user.target_type, targetId);
    } else {
      await assertCanManageUserTarget(req.user, "barangay", targetId);
    }
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

    const currentTarget = await getUserTarget(userId);
    await assertCanManageUserTarget(req.user, currentTarget.target_type, currentTarget.target_id);

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
    const { to, subject, body, html } = req.body;
    
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
    });
    
    logger.info(
      `Setup email accepted to: ${to}, provider: ${result.provider || "smtp"}, status: ${result.status || "n/a"}, messageId: ${result.messageId || ""}`
    );
    
    return res.status(200).json({ 
      message: "Setup email sent successfully.",
      messageId: result.messageId,
      provider: result.provider || "smtp",
      status: result.status,
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
    await assertCanManageUserTarget(req.user, user.target_type, user.target_id);
    return res.status(200).json({
      message: "User found",
      data: {
        id: user.id,
        email: user.email,
        hasPassword: Boolean(user.password),
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

    await assertCanManageUserTarget(req.user, targetType, targetId);

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
    const users = await User.getAdminUsers(req.user);

    return res.status(200).json({
      message: "Admin users fetched successfully",
      data: users,
    });
  } catch (error) {
    logger.error("Controller error in getAdminUsers:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};
