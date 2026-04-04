import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  activateResident,
  checkUsernameAvailability,
  deactivateResident,
  deleteResident,
  getResident,
  getResidentByResidentId,
  listResidents,
  markDeceased,
  markMovedOut,
  updateResident,
  updateMyProfile,
  checkEmailExists,
} from '../services/resident.service';
import prisma from '../config/database';

// GET /api/residents?page=&limit=&status=&search=&barangayId=&municipalityId=
export const listResidentsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      status:         req.query.status         as string | undefined,
      search:         req.query.search         as string | undefined,
      barangayId:     req.query.barangayId     ? parseInt(req.query.barangayId as string) : undefined,
      municipalityId: req.query.municipalityId ? parseInt(req.query.municipalityId as string) : undefined,
      page:           req.query.page           ? parseInt(req.query.page as string) : 1,
      limit:          req.query.limit          ? parseInt(req.query.limit as string) : 20,
    };
    const result = await listResidents(filters);
    res.status(200).json({ status: 'success', ...result });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/residents/me — resident's own profile (portal)
export const getMyProfileController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }
    const resident = await getResident(req.user.id);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// PUT /api/residents/me — resident self-update (portal auth)
export const updateMyProfileController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }
    const allowed = [
      'sex', 'civilStatus', 'birthdate',
      'citizenship', 'spouseName', 'isVoter', 'indigenousPerson',
      'birthRegion', 'birthProvince', 'birthMunicipality',
      'occupation', 'profession', 'employmentStatus', 'isEmployed',
      'educationAttainment', 'monthlyIncome', 'height', 'weight',
      'emergencyContactPerson', 'emergencyContactNumber',
      'idType', 'idDocumentNumber', 'acrNo',
    ];
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (key in req.body) data[key] = req.body[key];
    }
    const resident = await updateMyProfile(req.user.id, data);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// GET /api/residents/check-username?username=
export const checkUsernameController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const username = req.query.username as string;
    if (!username) {
      res.status(400).json({ status: 'error', message: 'username query param required' });
      return;
    }
    const result = await checkUsernameAvailability(username);
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/residents/check-email?email=
export const checkEmailController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const email = req.query.email as string;
    if (!email) {
      res.status(400).json({ status: 'error', message: 'email query param required' });
      return;
    }
    const result = await checkEmailExists(email);
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/residents/by-resident-id/:residentId
export const getByResidentIdController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resident = await getResidentByResidentId(req.params.residentId);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// GET /api/residents/:id
export const getResidentController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resident = await getResident(req.params.id);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// GET /api/residents/:id/transactions
export const getResidentTransactionsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page  = req.query.page  ? parseInt(req.query.page  as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const skip  = (page - 1) * limit;

    const where: any = { residentId: req.params.id };
    if (req.query.status)        where.status        = req.query.status;
    if (req.query.paymentStatus) where.paymentStatus = req.query.paymentStatus;

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { service: { select: { id: true, code: true, name: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      transactions,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PUT /api/residents/:id
export const updateResidentController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resident = await updateResident(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/residents/:id/activate
export const activateResidentController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resident = await activateResident(req.params.id);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/residents/:id/deactivate
export const deactivateResidentController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resident = await deactivateResident(req.params.id);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/residents/:id/deceased
export const markDeceasedController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resident = await markDeceased(req.params.id);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/residents/:id/moved-out
export const markMovedOutController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resident = await markMovedOut(req.params.id);
    res.status(200).json({ status: 'success', data: resident });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/residents/:id
export const deleteResidentController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteResident(req.params.id);
    res.status(200).json({ status: 'success', message: 'Resident deleted' });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};
