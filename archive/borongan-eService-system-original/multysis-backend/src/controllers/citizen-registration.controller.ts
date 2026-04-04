import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { addDevLog } from '../services/dev.service';
import {
  submitCitizenRegistration,
  getRegistrationStatus,
  getRegistrationRequests,
  getRegistrationRequestById,
  reviewRegistrationRequest,
  requestResubmission,
  markUnderReview,
  deleteRejectedRegistrations,
  deleteRejectedRegistration,
} from '../services/citizen-registration.service';

/**
 * Submit citizen registration (public endpoint)
 */
export const submitCitizenRegistrationController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await submitCitizenRegistration(req.body);

    addDevLog('info', 'Citizen registration submitted', {
      requestId: result.id,
      phoneNumber: result.phoneNumber,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(201).json({
      status: 'success',
      message: 'Registration submitted successfully. Please wait for admin approval.',
      data: result,
    });
  } catch (error: any) {
    addDevLog('error', 'Citizen registration failed', {
      phoneNumber: req.body.phoneNumber,
      error: error.message,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(400).json({
      status: 'error',
      message: error.message || 'Registration failed',
    });
  }
};

/**
 * Get registration status by phone number (public endpoint)
 */
export const getRegistrationStatusController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phone } = req.params;

    const result = await getRegistrationStatus(phone);

    if (!result) {
      res.status(404).json({
        status: 'error',
        message: 'No registration found for this phone number',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get registration status',
    });
  }
};

/**
 * Get all registration requests (admin endpoint)
 */
export const getRegistrationRequestsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, search, page, limit } = req.query;

    const result = await getRegistrationRequests({
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get registration requests',
    });
  }
};

/**
 * Get single registration request by ID (admin endpoint)
 */
export const getRegistrationRequestByIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await getRegistrationRequestById(id);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Registration request not found',
    });
  }
};

/**
 * Review registration request (approve/reject) (admin endpoint)
 */
export const reviewRegistrationRequestController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid action. Must be APPROVED or REJECTED',
      });
      return;
    }

    const result = await reviewRegistrationRequest(
      id,
      action,
      req.user!.id,
      adminNotes
    );

    addDevLog('info', `Citizen registration ${action.toLowerCase()}`, {
      requestId: id,
      adminId: req.user!.id,
      action,
    });

    res.status(200).json({
      status: 'success',
      message: `Registration ${action === 'APPROVED' ? 'approved' : 'rejected'} successfully`,
      data: result,
    });
  } catch (error: any) {
    addDevLog('error', 'Review registration failed', {
      requestId: req.params.id,
      error: error.message,
      adminId: req.user?.id,
    });

    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to review registration',
    });
  }
};

/**
 * Request resubmission from applicant (admin endpoint)
 */
export const requestResubmissionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes) {
      res.status(400).json({
        status: 'error',
        message: 'Admin notes are required when requesting resubmission',
      });
      return;
    }

    const result = await requestResubmission(id, req.user!.id, adminNotes);

    addDevLog('info', 'Resubmission requested', {
      requestId: id,
      adminId: req.user!.id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Resubmission requested successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to request resubmission',
    });
  }
};

/**
 * Mark registration request as under review (admin endpoint)
 */
export const markUnderReviewController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await markUnderReview(id, req.user!.id);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to mark as under review',
    });
  }
};

/**
 * Delete rejected registrations older than X days (admin endpoint)
 * This is called by a scheduled cron job or manually by admin
 */
export const deleteRejectedRegistrationsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { daysOld } = req.query;
    const days = daysOld ? parseInt(daysOld as string) : 30;

    if (days < 1 || days > 365) {
      res.status(400).json({
        status: 'error',
        message: 'daysOld must be between 1 and 365',
      });
      return;
    }

    const deletedCount = await deleteRejectedRegistrations(days);

    addDevLog('info', 'Rejected registrations cleaned up', {
      deletedCount,
      daysOld: days,
      adminId: req.user!.id,
    });

    res.status(200).json({
      status: 'success',
      message: `Deleted ${deletedCount} rejected registration(s) older than ${days} days`,
      data: { deletedCount },
    });
  } catch (error: any) {
    addDevLog('error', 'Delete rejected registrations failed', {
      error: error.message,
      adminId: req.user?.id,
    });

    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete rejected registrations',
    });
  }
};

/**
 * Delete a specific rejected registration (admin endpoint)
 */
export const deleteRejectedRegistrationController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { citizenId } = req.params;

    const result = await deleteRejectedRegistration(citizenId);

    addDevLog('info', 'Specific rejected registration deleted', {
      citizenId,
      adminId: req.user!.id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Rejected registration deleted successfully',
      data: result,
    });
  } catch (error: any) {
    addDevLog('error', 'Delete specific rejected registration failed', {
      citizenId: req.params.citizenId,
      error: error.message,
      adminId: req.user?.id,
    });

    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to delete rejected registration',
    });
  }
};
