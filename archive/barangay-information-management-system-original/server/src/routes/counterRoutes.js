import express from "express";
import { allUsers } from "../middlewares/auth.js";
import { getPrefix, updatePrefix } from "../controllers/counterControllers.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";

const router = express.Router();

// Get current prefix
router.get("/prefix", smartCache(), ...allUsers, getPrefix);

// Update prefix (only admin users should be able to do this)
router.put("/prefix", ...allUsers, updatePrefix, smartInvalidateCache());

export default router;
