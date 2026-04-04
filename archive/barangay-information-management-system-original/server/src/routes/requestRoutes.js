import express from "express";
import {
  submitCertificateRequest,
  submitAppointmentRequest,
  getRequestById,
  trackRequestById,
  getMyRequests,
  updateRequestStatus,
  getAllRequests,
} from "../controllers/requestControllers.js";
import { allUsers } from "../middlewares/auth.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";

const router = express.Router();

// Public routes (no authentication required)
router.post("/public/requests/certificate", submitCertificateRequest, smartInvalidateCache());
router.post("/public/requests/appointment", submitAppointmentRequest, smartInvalidateCache());
router.get("/public/track/:requestId", smartCache(), trackRequestById);
// router.get("/public/requests/:requestId", getRequestById);

// Protected routes (require authentication)
router.get("/requests/my-requests", smartCache(), ...allUsers, getMyRequests);
router.put("/requests/:requestId/status", ...allUsers, updateRequestStatus, smartInvalidateCache());
router.get("/requests", smartCache(), ...allUsers, getAllRequests);

export default router;
