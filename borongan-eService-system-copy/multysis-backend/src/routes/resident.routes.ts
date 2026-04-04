import { Router } from 'express';
import { verifyAdmin, verifyToken } from '../middleware/auth';
import {
  activateResidentController,
  checkUsernameController,
  checkEmailController,
  deactivateResidentController,
  deleteResidentController,
  getByResidentIdController,
  getMyProfileController,
  getResidentController,
  getResidentTransactionsController,
  listResidentsController,
  markDeceasedController,
  markMovedOutController,
  updateResidentController,
  updateMyProfileController,
} from '../controllers/resident.controller';

const router = Router();

// ── Public / resident-scoped ──────────────────────────────────────────────────

// Username availability check (used during portal registration — no auth)
router.get('/check-username', checkUsernameController);

// Email existence check (used during portal registration — no auth)
router.get('/check-email', checkEmailController);

// Resident's own profile (portal auth)
router.get('/me', verifyToken, getMyProfileController);

// Resident self-update (portal auth)
router.put('/me', verifyToken, updateMyProfileController);

// Lookup by display ID (e.g. RES-2026-0000001) — admin or portal
router.get('/by-resident-id/:residentId', verifyToken, getByResidentIdController);

// ── Admin-only ────────────────────────────────────────────────────────────────
router.use(verifyAdmin);

// List all residents (paginated, filtered)
router.get('/', listResidentsController);

// Get resident transactions
router.get('/:id/transactions', getResidentTransactionsController);

// Get single resident
router.get('/:id', getResidentController);

// Update resident fields
router.put('/:id', updateResidentController);

// Status changes
router.patch('/:id/activate',   activateResidentController);
router.patch('/:id/deactivate', deactivateResidentController);
router.patch('/:id/deceased',   markDeceasedController);
router.patch('/:id/moved-out',  markMovedOutController);

// Hard delete (admin only — restricted by FK if transactions exist)
router.delete('/:id', deleteResidentController);

export default router;
