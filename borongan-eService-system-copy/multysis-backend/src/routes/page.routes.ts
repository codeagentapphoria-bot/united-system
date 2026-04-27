import { Router } from 'express';
import {
  createPageController,
  getPagesController,
  getPageController,
  updatePageController,
  deletePageController,
  getDistinctSystemsController,
} from '../controllers/page.controller';
import { verifyAdmin } from '../middleware/auth';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.get('/systems', getDistinctSystemsController);
router.get('/', getPagesController);
router.get('/:id', getPageController);
router.post('/', createPageController);
router.put('/:id', updatePageController);
router.delete('/:id', deletePageController);

export default router;
