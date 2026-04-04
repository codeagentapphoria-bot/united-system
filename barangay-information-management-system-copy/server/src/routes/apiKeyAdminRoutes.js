import express from "express";
import { protect, restrictTo } from "../middlewares/auth.js";
import { createApiKey, listApiKeys, revokeApiKey, revealApiKey, deleteApiKey } from "../controllers/apiKeyAdminControllers.js";

const router = express.Router();

// Municipal HR/Admin can manage keys
router.use(protect, restrictTo('admin', 'staff'));

router.get("/keys", listApiKeys);
router.post("/keys", createApiKey);
router.post("/keys/:id/revoke", revokeApiKey);
router.delete("/keys/:id", deleteApiKey);
router.get("/keys/:id/reveal", revealApiKey);

export default router;


