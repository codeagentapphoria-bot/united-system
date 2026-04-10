import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

// Known user-facing error substrings — these are safe to forward to the client.
// Everything else is sanitized to a generic message to prevent leaking Prisma internals.
const USER_FACING_SUBSTRINGS = [
  'not found',
  'inactive',
  'not eligible',
  'already have',
  'Unauthorized',
  'Only pending',
  'Only active residents',
  'action must be',
  'not found or inactive',
];

function toUserMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg && USER_FACING_SUBSTRINGS.some((k) => msg.toLowerCase().includes(k.toLowerCase()))) {
    return msg;
  }
  if (msg) console.error('[portal-programs] Unexpected error:', msg);
  return 'An unexpected error occurred';
}

import {
  applyForProgram,
  cancelApplication,
  getApplicationAdmin,
  getMyApplications,
  getProgramForResident,
  listApplicationsAdmin,
  listProgramsForResident,
  reviewApplicationAdmin,
} from '../services/portal-programs.service';

// =============================================================================
// PORTAL (resident-facing)
// =============================================================================

export const listProgramsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const residentId = req.user!.id;
    const result = await listProgramsForResident(residentId, {
      search: (req.query.search as string) || undefined,
      type: (req.query.type as string) || undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: toUserMessage(error) });
  }
};

export const getProgramController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const residentId = req.user!.id;
    const { id } = req.params;
    const data = await getProgramForResident(id, residentId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    const msg = toUserMessage(error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ status: 'error', message: msg });
  }
};

export const applyForProgramController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const residentId = req.user!.id;
    const { id } = req.params;
    const application = await applyForProgram(residentId, id);
    res.status(201).json({ status: 'success', data: application });
  } catch (error: any) {
    const msg = toUserMessage(error);
    const status =
      error instanceof Error &&
      (error.message.includes('not eligible') ||
        error.message.includes('already have') ||
        error.message.includes('not found'))
        ? 400
        : 500;
    res.status(status).json({ status: 'error', message: msg });
  }
};

export const getMyApplicationsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const residentId = req.user!.id;
    const data = await getMyApplications(residentId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: toUserMessage(error) });
  }
};

export const cancelApplicationController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const residentId = req.user!.id;
    const { appId } = req.params;
    const data = await cancelApplication(appId, residentId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    const msg = toUserMessage(error);
    const status = error instanceof Error && error.message === 'Unauthorized' ? 403 : 400;
    res.status(status).json({ status: 'error', message: msg });
  }
};

// =============================================================================
// ADMIN
// =============================================================================

export const listApplicationsAdminController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await listApplicationsAdmin({
      status: (req.query.status as string) || undefined,
      programId: (req.query.programId as string) || undefined,
      search: (req.query.search as string) || undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: toUserMessage(error) });
  }
};

export const getApplicationAdminController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { appId } = req.params;
    const data = await getApplicationAdmin(appId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    const msg = toUserMessage(error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ status: 'error', message: msg });
  }
};

export const reviewApplicationAdminController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { appId } = req.params;
    const { action, adminNotes } = req.body as {
      action: 'approve' | 'reject';
      adminNotes?: string;
    };

    // Belt-and-braces check (express-validator also validates this at the route level)
    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ status: 'error', message: 'action must be approve or reject' });
      return;
    }

    const adminId = parseInt(req.user!.id, 10);
    const data = await reviewApplicationAdmin(appId, action, adminId, adminNotes);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    const msg = toUserMessage(error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ status: 'error', message: msg });
  }
};
