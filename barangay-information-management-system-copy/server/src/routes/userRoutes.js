import express from "express";
import {
  upsertUser,
  deleteUser,
  userList,
  userInfo,
  sendSetupEmail,
  getUserByEmail,
  getUsersByTarget,
  getAdminUsers,
  checkUserConflicts,
} from "../controllers/userControllers.js";
import { protect, allUsers } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import SetupTokenService from "../services/setupTokenService.js";
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import { cacheUtils } from "../config/redis.js";
import { cp } from "fs/promises";

const router = express.Router();

// Route to get users by target type and ID (MUST come before /:userId/user)
router.get(
  "/target/:targetType/:targetId/users",
  smartCache(),
  ...allUsers,
  getUsersByTarget
);

// Route to get all admin users
router.get("/user/admins", smartCache(), ...allUsers, getAdminUsers);

// Public route to get user by email (MUST come before /:userId/user)
router.get("/user/by-email", getUserByEmail);

// Public route to check user conflicts
router.get("/user/conflicts", checkUserConflicts);

router.get("/list/:targetId/user", smartCache(), ...allUsers, userList);
router.get("/:userId/user", smartCache(), ...allUsers, userInfo);
router.post(
  "/user",
  createUploader(() => "uploads/users", [{ name: "picturePath", maxCount: 1 }]),
  upsertUser,
  smartInvalidateCache()
);
router.put(
  "/:userId/user",
  ...allUsers,
  createUploader(() => "uploads/users", [{ name: "picturePath", maxCount: 1 }]),
  upsertUser,
  smartInvalidateCache()
);
router.delete("/:userId/user", ...allUsers, deleteUser, smartInvalidateCache());

// Public route to send setup email
router.post("/send-setup-email", sendSetupEmail);

// Public route to complete account setup using a setup token (no auth required)
router.post(
  "/complete-account-setup",
  createUploader(() => "uploads/users", [{ name: "picturePath", maxCount: 1 }]),
  async (req, res) => {
    const { token, fullname, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "token and password are required" });
    }
    try {
      const setupData = SetupTokenService.validateSetupToken(token);
      const { email } = setupData;

      // Find existing user by email
      const userResult = await pool.query(
        "SELECT id FROM bims_users WHERE email = $1",
        [email]
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Account not found. Please contact your administrator." });
      }
      const userId = userResult.rows[0].id;
      const hashedPassword = await bcrypt.hash(password, 10);
      const picturePath = req.files?.picturePath?.[0]?.path || null;

      await pool.query(
        `UPDATE bims_users SET
          full_name = COALESCE($1, full_name),
          password = $2
          ${picturePath ? ", picture_path = $4" : ""}
          , updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
        picturePath
          ? [fullname || null, hashedPassword, userId, picturePath]
          : [fullname || null, hashedPassword, userId]
      );

      cacheUtils.del(`bims:user:${userId}`).catch(() => {});

      return res.status(200).json({ message: "Account setup complete." });
    } catch (err) {
      return res.status(401).json({ message: err.message || "Invalid or expired setup token." });
    }
  }
);

export default router;
