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

const router = express.Router();

// Public routes (no authentication required)
router.post("/public/requests/certificate", submitCertificateRequest);
router.post("/public/requests/appointment", submitAppointmentRequest);
router.get("/public/track/:requestId", trackRequestById);
router.get("/public/requests/:requestId", getRequestById);

// Protected routes (require authentication)
router.get("/requests/my-requests", ...allUsers, getMyRequests);
router.put("/requests/:requestId/status", ...allUsers, updateRequestStatus);
router.get("/requests", ...allUsers, getAllRequests);

export default router;
