import express from "express";
import { protect, restrictTo } from "../middlewares/auth.js";
import { createApiKey, listApiKeys, revokeApiKey, revealApiKey, deleteApiKey } from "../controllers/apiKeyAdminControllers.js";

const router = express.Router();

// Municipal HR/Admin can manage keys
router.use(protect, restrictTo('admin', 'staff'));

router.get("/", listApiKeys);
router.post("/", createApiKey);
router.post("/:id/revoke", revokeApiKey);
router.delete("/:id", deleteApiKey);
router.get("/:id/reveal", revealApiKey);

export default router;


