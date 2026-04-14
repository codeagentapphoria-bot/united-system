/**
 * portal-registration.controller.ts
 *
 * Handles resident self-registration via the portal.
 * Replaces: citizen-registration.controller.ts
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  deleteRejectedRegistrations,
  getRegistrationRequest,
  getRegistrationStatus,
  listRegistrationRequests,
  markUnderReview,
  resubmitDocuments,
  requestResubmission,
  reviewRegistrationRequest,
  submitRegistration,
} from '../services/portal-registration.service';
import { socialAmeliorationSettingService } from '../services/social-amelioration-setting.service';

// Known user-facing error substrings — safe to forward to clients.
// Everything else gets a generic message to avoid leaking DB/Prisma internals.
const USER_FACING_SUBSTRINGS = [
  'already',
  'not found',
  'required',
  'invalid',
  'username',
  'email',
  'password',
  'pending review',
  'under review',
  'rejected',
  'approved',
];

function toUserMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg && USER_FACING_SUBSTRINGS.some((k) => msg.toLowerCase().includes(k.toLowerCase()))) {
    return msg;
  }
  if (msg) console.error('[portal-registration] Unexpected error:', msg);
  return 'An unexpected error occurred';
}

// =============================================================================
// PUBLIC: Get active social amelioration settings by type
// GET /api/portal-registration/amelioration-settings?type=PENSION_TYPE
// =============================================================================
export const getPublicAmeliorationSettingsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type } = req.query;
    const settings = await socialAmeliorationSettingService.getSettings({
      type: type as any,
      isActive: true,
    });
    res.status(200).json({ status: 'success', data: settings });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: toUserMessage(error) });
  }
};

// =============================================================================
// PUBLIC: Submit registration
// POST /api/portal-registration/register
// =============================================================================
export const submitRegistrationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      extensionName,
      birthdate,
      sex,
      civilStatus,
      birthRegion,
      birthProvince,
      birthMunicipality,
      citizenship,
      contactNumber,
      email,
      barangayId,
      streetAddress,
      occupation,
      profession,
      employmentStatus,
      educationAttainment,
      monthlyIncome,
      height,
      weight,
      isVoter,
      isEmployed,
      indigenousPerson,
      hasDisability,
      hasChildren,
      idType,
      idDocumentNumber,
      idDocumentUrl,
      selfieUrl,
      picturePath,
      username,
      password,
      emergencyContactPerson,
      emergencyContactNumber,
      spouseName,
      acrNo,
      ameliorationData,
    } = req.body;

    const result = await submitRegistration({
      firstName,
      middleName,
      lastName,
      extensionName,
      birthdate,
      sex,
      civilStatus,
      birthRegion,
      birthProvince,
      birthMunicipality,
      citizenship,
      contactNumber,
      email,
      barangayId: Number(barangayId),
      streetAddress,
      occupation,
      profession,
      employmentStatus,
      educationAttainment,
      monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
      height,
      weight,
      isVoter: Boolean(isVoter),
      isEmployed: Boolean(isEmployed),
      indigenousPerson: Boolean(indigenousPerson),
      hasDisability: Boolean(hasDisability),
      hasChildren: Boolean(hasChildren),
      idType,
      idDocumentNumber,
      idDocumentUrl,
      selfieUrl,
      picturePath,
      username,
      password,
      emergencyContactPerson,
      emergencyContactNumber,
      spouseName,
      acrNo,
      ameliorationData: ameliorationData || null,
    });

    res.status(201).json({
      status: 'success',
      message: 'Registration submitted successfully. Your application is now pending review.',
      data: result,
    });
  } catch (error: any) {
    const msg = toUserMessage(error);
    const status = error.message?.includes('already') ? 409 : 400;
    res.status(status).json({ status: 'error', message: msg });
  }
};

// =============================================================================
// PUBLIC: Check registration status by username
// GET /api/portal-registration/status/:username
// =============================================================================
export const getRegistrationStatusController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;
    const status = await getRegistrationStatus(username);
    res.status(200).json({ status: 'success', data: status });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: toUserMessage(error) });
  }
};

// =============================================================================
// BIMS ADMIN: List registration requests
// GET /api/portal-registration/requests
// =============================================================================
export const listRegistrationRequestsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, search, barangayId, page, limit } = req.query;

    const result = await listRegistrationRequests({
      status: status as string,
      search: search as string,
      barangayId: barangayId ? Number(barangayId) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: toUserMessage(error) });
  }
};

// =============================================================================
// BIMS ADMIN: Get single registration request
// GET /api/portal-registration/requests/:id
// =============================================================================
export const getRegistrationRequestController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await getRegistrationRequest(id);
    res.status(200).json({ status: 'success', data: request });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: toUserMessage(error) });
  }
};

// =============================================================================
// BIMS ADMIN: Mark as under review
// PATCH /api/portal-registration/requests/:id/under-review
// =============================================================================
export const markUnderReviewController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const reviewerId = (req as any).bimsUserId; // set by BIMS auth middleware

    const result = await markUnderReview(id, reviewerId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: toUserMessage(error) });
  }
};

// =============================================================================
// BIMS ADMIN: Review (approve / reject)
// POST /api/portal-registration/requests/:id/review
// Body: { action: 'approve' | 'reject', adminNotes?: string }
// =============================================================================
export const reviewRegistrationController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body;
    const reviewerId = (req as any).bimsUserId;

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ status: 'error', message: 'action must be "approve" or "reject"' });
      return;
    }

    const result = await reviewRegistrationRequest(id, {
      action,
      adminNotes,
      reviewerId: Number(reviewerId),
    });

    const message = action === 'approve' ? 'Registration approved' : 'Registration rejected';

    // Warn the admin if the approval email failed to send so they can
    // manually provide credentials to the resident.
    if (action === 'approve' && result.emailSent === false) {
      res.status(200).json({
        status: 'success',
        message: `${message} — but the notification email could not be sent. Please share login credentials with the resident manually.`,
        data: result,
      });
      return;
    }

    res.status(200).json({ status: 'success', message, data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: toUserMessage(error) });
  }
};

// =============================================================================
// BIMS ADMIN: Request resubmission
// POST /api/portal-registration/requests/:id/request-docs
// =============================================================================
export const requestResubmissionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const reviewerId = (req as any).bimsUserId;

    const result = await requestResubmission(id, adminNotes, Number(reviewerId));
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: toUserMessage(error) });
  }
};

// =============================================================================
// PUBLIC: Resident re-uploads documents after resubmission request
// POST /api/portal-registration/resubmit
// Body: { username, selfieUrl, idDocumentUrl }
// =============================================================================
export const resubmitHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, selfieUrl, idDocumentUrl } = req.body;
    if (!username || !selfieUrl || !idDocumentUrl) {
      res
        .status(400)
        .json({ status: 'error', message: 'username, selfieUrl, and idDocumentUrl are required' });
      return;
    }
    await resubmitDocuments(username, selfieUrl, idDocumentUrl);
    res.json({
      status: 'success',
      message: 'Resubmission received. Your application is under review again.',
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: toUserMessage(err) });
  }
};

// =============================================================================
// BIMS ADMIN: Delete old rejected registrations
// DELETE /api/portal-registration/requests/rejected
// =============================================================================
export const deleteRejectedController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const olderThanDays = req.query.days ? Number(req.query.days) : 30;
    const result = await deleteRejectedRegistrations(olderThanDays);
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: toUserMessage(error) });
  }
};
