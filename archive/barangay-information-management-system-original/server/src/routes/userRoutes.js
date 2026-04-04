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

export default router;
