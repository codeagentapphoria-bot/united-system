import { Router } from 'express';
import {
  createSystemController,
  getSystemsController,
  getSystemController,
  updateSystemController,
  deleteSystemController,
} from '../controllers/system.controller';
import { verifyAdmin } from '../middleware/auth';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.get('/', getSystemsController);
router.get('/:slug', getSystemController);
router.post('/', createSystemController);
router.put('/:slug', updateSystemController);
router.delete('/:slug', deleteSystemController);

export default router;
