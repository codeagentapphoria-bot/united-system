import { Router } from 'express';
import {
  activateGovernmentProgramController,
  createGovernmentProgramController,
  deactivateGovernmentProgramController,
  deleteGovernmentProgramController,
  getGovernmentProgramController,
  getGovernmentProgramsController,
  updateGovernmentProgramController,
} from '../controllers/government-program.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  activateGovernmentProgramValidation,
  createGovernmentProgramValidation,
  deactivateGovernmentProgramValidation,
  getGovernmentProgramValidation,
  getGovernmentProgramsValidation,
  updateGovernmentProgramValidation,
} from '../validations/government-program.schema';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

// Get all government programs with filters
router.get('/', validate(getGovernmentProgramsValidation), getGovernmentProgramsController);

// Get single government program
router.get('/:id', validate(getGovernmentProgramValidation), getGovernmentProgramController);

// Create government program
router.post('/', validate(createGovernmentProgramValidation), createGovernmentProgramController);

// Update government program
router.put('/:id', validate(updateGovernmentProgramValidation), updateGovernmentProgramController);

// Activate government program
router.patch(
  '/:id/activate',
  validate(activateGovernmentProgramValidation),
  activateGovernmentProgramController
);

// Deactivate government program
router.patch(
  '/:id/deactivate',
  validate(deactivateGovernmentProgramValidation),
  deactivateGovernmentProgramController
);

// Delete government program
router.delete('/:id', validate(getGovernmentProgramValidation), deleteGovernmentProgramController);

export default router;
