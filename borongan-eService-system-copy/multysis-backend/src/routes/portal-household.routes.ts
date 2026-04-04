/**
 * portal-household.routes.ts
 *
 * Resident portal household endpoints.
 * All routes require an active resident session (verifyResident).
 *
 * Mounted at: /api/portal/household
 */

import { Router } from 'express';
import { verifyResident } from '../middleware/auth';
import {
  addMember,
  getMyHousehold,
  registerHousehold,
  removeMember,
} from '../controllers/portal-household.controller';

const router = Router();

// GET  /api/portal/household/my
router.get('/my', verifyResident, getMyHousehold);

// POST /api/portal/household
router.post('/', verifyResident, registerHousehold);

// POST /api/portal/household/:householdId/members
router.post('/:householdId/members', verifyResident, addMember);

// DELETE /api/portal/household/:householdId/members/:memberId
router.delete('/:householdId/members/:memberId', verifyResident, removeMember);

export default router;
