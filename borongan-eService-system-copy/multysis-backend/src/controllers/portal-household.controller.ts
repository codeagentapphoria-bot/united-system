/**
 * portal-household.controller.ts
 *
 * Thin controller layer for the resident portal household endpoints.
 * Auth is handled upstream by the verifyResident middleware —
 * req.user.id is the resident's UUID.
 */

import { NextFunction, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import * as householdService from '../services/portal-household.service';

// GET /api/portal/household/my
export const getMyHousehold = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const residentId = req.user!.id;
    const data = await householdService.getMyHousehold(residentId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// POST /api/portal/household
export const registerHousehold = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const residentId = req.user!.id;
    const {
      houseNumber,
      street,
      barangayId,
      housingType,
      structureType,
      electricity,
      waterSource,
      toiletFacility,
      geom,
      area,
      householdImagePath,
      families,
    } = req.body;

    const data = await householdService.registerHousehold(residentId, {
      houseNumber,
      street,
      barangayId: barangayId ? Number(barangayId) : null,
      housingType,
      structureType,
      electricity: electricity === true || electricity === 'true' || electricity === 'Yes',
      waterSource,
      toiletFacility,
      geom: geom ?? null,
      area: area != null ? Number(area) : null,
      householdImagePath: householdImagePath ?? null,
      families: families ?? [],
    });

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

// POST /api/portal/household/:householdId/members
export const addMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const residentId  = req.user!.id;
    const householdId = Number(req.params.householdId);
    const {
      memberResidentId,
      relationshipToHead,
      familyGroup,
    } = req.body;

    if (!memberResidentId) {
      res.status(400).json({ message: 'memberResidentId is required' });
      return;
    }

    const member = await householdService.addMember(
      residentId,
      householdId,
      memberResidentId,
      relationshipToHead ?? null,
      familyGroup ?? 'Main Family'
    );

    res.status(201).json({ message: 'Member added successfully', member });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/portal/household/:householdId/members/:memberId
export const removeMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const residentId  = req.user!.id;
    const householdId = Number(req.params.householdId);
    const memberId    = req.params.memberId;

    await householdService.removeMember(residentId, householdId, memberId);

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    next(err);
  }
};
