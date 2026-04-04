import express from "express";
import { allUsers } from "../middlewares/auth.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  createVaccine,
  getVaccinesByTarget,
  updateVaccine,
  deleteVaccine,
  getVaccineById,
} from "../controllers/vaccineControllers.js";

const router = express.Router();

// Vaccine routes
router.post("/vaccine", ...allUsers, createVaccine, smartInvalidateCache());
router.get("/vaccines/:targetType/:targetId", smartCache(), ...allUsers, getVaccinesByTarget);
router.get("/vaccine/:id", smartCache(), ...allUsers, getVaccineById);
router.put("/vaccine/:id", ...allUsers, updateVaccine, smartInvalidateCache());
router.delete("/vaccine/:id", ...allUsers, deleteVaccine, smartInvalidateCache());

export default router;
