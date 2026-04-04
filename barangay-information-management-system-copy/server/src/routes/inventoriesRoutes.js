import express from "express";
import { allUsers } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  upsertInventory,
  deleteInventory,
  inventoryList,
  inventoryInfo
} from "../controllers/inventoriesControllers.js";

const router = express.Router();

router.get('/list/inventories', smartCache(), ...allUsers, inventoryList);
router.get('/:inventoryId/inventory', smartCache(), ...allUsers, inventoryInfo);
router.post('/inventory', createUploader(() => 'uploads/inventories', [{ name: 'filePath', maxCount: 1 }]), ...allUsers, upsertInventory, smartInvalidateCache());
router.put('/:inventoryId/inventory', createUploader(() => 'uploads/inventories', [{ name: 'filePath', maxCount: 1 }]), ...allUsers, upsertInventory, smartInvalidateCache());
router.delete('/:inventoryId/inventory', ...allUsers, deleteInventory, smartInvalidateCache());

export default router; 