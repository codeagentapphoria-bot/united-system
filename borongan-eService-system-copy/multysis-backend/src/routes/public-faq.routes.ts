import { Router } from 'express';
import { getActiveFAQsController, getPaginatedFAQsController } from '../controllers/faq.controller';
import { validate } from '../middleware/validation';
import { getActiveFAQsValidation, getPaginatedFAQsValidation } from '../validations/faq.schema';

const router = Router();

// Public routes - no authentication required
// Get active FAQs (for homepage, with optional limit)
router.get('/active', validate(getActiveFAQsValidation), getActiveFAQsController);

// Get paginated FAQs (for FAQ list page)
router.get('/paginated', validate(getPaginatedFAQsValidation), getPaginatedFAQsController);

export default router;
