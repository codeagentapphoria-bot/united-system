import { Router } from 'express';
import {
  activateFAQController,
  createFAQController,
  deactivateFAQController,
  deleteFAQController,
  getFAQController,
  getFAQsController,
} from '../controllers/faq.controller';
import { verifyAdmin, verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  activateFAQValidation,
  createFAQValidation,
  deactivateFAQValidation,
  getFAQValidation,
  getFAQsValidation,
  updateFAQValidation,
} from '../validations/faq.schema';
import { updateFAQController } from '../controllers/faq.controller';

const router = Router();

// GET routes are accessible to both admin and subscribers (read-only)
// Get all FAQs with filters
router.get('/', verifyToken, validate(getFAQsValidation), getFAQsController);

// Get single FAQ
router.get('/:id', verifyToken, validate(getFAQValidation), getFAQController);

// All other routes (POST, PUT, PATCH, DELETE) require admin authentication
router.use(verifyAdmin);

// Create FAQ
router.post('/', validate(createFAQValidation), createFAQController);

// Update FAQ
router.put('/:id', validate(updateFAQValidation), updateFAQController);

// Activate FAQ
router.patch('/:id/activate', validate(activateFAQValidation), activateFAQController);

// Deactivate FAQ
router.patch('/:id/deactivate', validate(deactivateFAQValidation), deactivateFAQController);

// Delete FAQ
router.delete('/:id', validate(getFAQValidation), deleteFAQController);

export default router;
