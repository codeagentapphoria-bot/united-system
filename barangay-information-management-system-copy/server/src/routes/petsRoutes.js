import express from "express";
import { allUsers } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  upsertPet,
  deletePet,
  petList,
  petInfo,
  getPetsByHousehold,
  getPetsByOwner,
  searchPets,
} from "../controllers/petsControllers.js";

const router = express.Router();

router.get("/list/pets", smartCache(), ...allUsers, petList);
router.get("/household/:householdId/pets", smartCache(), ...allUsers, getPetsByHousehold);
router.get("/owner/:ownerId/pets", smartCache(), ...allUsers, getPetsByOwner);
router.get("/:petId/pet", smartCache(), ...allUsers, petInfo);
// Public route must be defined before the authenticated /search route
router.post("/public/search", searchPets);
router.post("/search", ...allUsers, searchPets);
router.post(
  "/pet",
  createUploader("pets", [{ name: "picturePath", maxCount: 1 }]),
  ...allUsers,
  upsertPet,
  smartInvalidateCache()
);
router.put(
  "/:petId/pet",
  createUploader("pets", [{ name: "picturePath", maxCount: 1 }]),
  ...allUsers,
  upsertPet,
  smartInvalidateCache()
);
router.delete("/:petId/pet", ...allUsers, deletePet, smartInvalidateCache());

// Image upload route for pet sync process
router.post(
  "/sync/pet/image",
  createUploader("pets", [{ name: "picturePath", maxCount: 1 }]),
  ...allUsers,
  (req, res) => {
    try {
      if (!req.files?.picturePath) {
        return res.status(400).json({
          message: "No image uploaded",
          data: null
        });
      }

      const uploadedFile = req.files.picturePath[0];

      return res.status(200).json({
        message: "Pet image uploaded successfully",
        data: {
          filename: uploadedFile.originalname,
          path: uploadedFile.path // Supabase public URL
        }
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error uploading pet image",
        data: null
      });
    }
  }
);

export default router;
