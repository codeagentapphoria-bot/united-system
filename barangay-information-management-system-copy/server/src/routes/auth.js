import express from "express";
import {
  login,
  requestPasswordReset,
  resetPasswordWithCode,
  refreshUserToken,
  logout,
} from "../controllers/auth.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPasswordWithCode);
router.post("/refresh", refreshUserToken);
router.post("/logout", logout);

router.get("/me", protect, (req, res) => {
  res.status(200).json({
    status: "success",
    data: { user: req.user },
  });
});

export default router;
