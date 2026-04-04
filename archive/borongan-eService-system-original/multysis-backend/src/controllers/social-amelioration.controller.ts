import { BeneficiaryStatus } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../config/database';
import {
  CreatePWDBeneficiaryData,
  CreateSeniorBeneficiaryData,
  CreateSoloParentBeneficiaryData,
  CreateStudentBeneficiaryData,
  socialAmeliorationService,
  UpdatePWDBeneficiaryData,
  UpdateSeniorBeneficiaryData,
  UpdateSoloParentBeneficiaryData,
  UpdateStudentBeneficiaryData,
} from '../services/social-amelioration.service';
import {
  emitBeneficiaryDelete,
  emitBeneficiaryNew,
  emitBeneficiaryUpdate,
} from '../services/socket.service';

const parseStatus = (value?: string): BeneficiaryStatus | undefined => {
  if (!value) return undefined;
  const upper = value.toUpperCase() as BeneficiaryStatus;
  return Object.values(BeneficiaryStatus).includes(upper) ? upper : undefined;
};

const parsePagination = (req: Request) => ({
  page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
});

const parseFilters = (req: Request) => ({
  search: (req.query.search as string) || undefined,
  status: parseStatus(req.query.status as string),
  programId: (req.query.programId as string) || undefined,
});

export const getSeniorBeneficiariesController = async (req: Request, res: Response) => {
  try {
    const result = await socialAmeliorationService.listSeniorBeneficiaries(
      parseFilters(req),
      parsePagination(req)
    );
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error: any) {
    res
      .status(500)
      .json({
        status: 'error',
        message: error.message || 'Failed to fetch senior citizen beneficiaries',
      });
  }
};

export const createSeniorBeneficiaryController = async (req: Request, res: Response) => {
  try {
    const payload: CreateSeniorBeneficiaryData = {
      citizenId: req.body.citizenId,
      pensionTypes: req.body.pensionTypes,
      governmentPrograms: req.body.governmentPrograms,
      status: parseStatus(req.body.status),
      remarks: req.body.remarks,
    };
    const record = await socialAmeliorationService.createSeniorBeneficiary(payload);

    // Emit WebSocket event for new beneficiary
    emitBeneficiaryNew({
      beneficiaryId: record.id,
      type: 'SENIOR_CITIZEN',
      citizenId: record.citizenId,
      status: record.status || undefined,
      programIds: record.governmentPrograms?.map((p: any) => p.id || p) || undefined,
      createdAt: record.createdAt,
    });

    res.status(201).json({ status: 'success', data: record });
  } catch (error: any) {
    res
      .status(400)
      .json({
        status: 'error',
        message: error.message || 'Failed to create senior citizen beneficiary',
      });
  }
};

export const updateSeniorBeneficiaryController = async (req: Request, res: Response) => {
  try {
    // Get old record to capture old status
    const oldRecord = await prisma.seniorCitizenBeneficiary.findUnique({
      where: { id: req.params.id },
    });
    const oldStatus = oldRecord?.status || undefined;

    const payload: UpdateSeniorBeneficiaryData = {
      pensionTypes: req.body.pensionTypes,
      governmentPrograms: req.body.governmentPrograms,
      status: parseStatus(req.body.status),
      remarks: req.body.remarks,
    };
    const record = await socialAmeliorationService.updateSeniorBeneficiary(req.params.id, payload);

    // Emit WebSocket event for beneficiary update
    emitBeneficiaryUpdate(req.params.id, 'SENIOR_CITIZEN', {
      citizenId: record.citizenId,
      status: record.status || undefined,
      oldStatus,
      programIds: record.governmentPrograms?.map((p: any) => p.id || p) || undefined,
      updatedAt: record.updatedAt,
    });

    res.status(200).json({ status: 'success', data: record });
  } catch (error: any) {
    res
      .status(400)
      .json({
        status: 'error',
        message: error.message || 'Failed to update senior citizen beneficiary',
      });
  }
};

export const deleteSeniorBeneficiaryController = async (req: Request, res: Response) => {
  try {
    // Get record before deletion to get citizenId
    const record = await prisma.seniorCitizenBeneficiary.findUnique({
      where: { id: req.params.id },
    });
    const citizenId = record?.citizenId;

    await socialAmeliorationService.deleteSeniorBeneficiary(req.params.id);

    // Emit WebSocket event for beneficiary deletion
    emitBeneficiaryDelete(req.params.id, 'SENIOR_CITIZEN', citizenId);

    res
      .status(200)
      .json({ status: 'success', message: 'Senior citizen beneficiary removed successfully' });
  } catch (error: any) {
    res
      .status(400)
      .json({
        status: 'error',
        message: error.message || 'Failed to remove senior citizen beneficiary',
      });
  }
};

export const getPWDBeneficiariesController = async (req: Request, res: Response) => {
  try {
    const result = await socialAmeliorationService.listPWDBeneficiaries(
      parseFilters(req),
      parsePagination(req)
    );
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error: any) {
    res
      .status(500)
      .json({ status: 'error', message: error.message || 'Failed to fetch PWD beneficiaries' });
  }
};

export const createPWDBeneficiaryController = async (req: Request, res: Response) => {
  try {
    const payload: CreatePWDBeneficiaryData = {
      citizenId: req.body.citizenId,
      disabilityType: req.body.disabilityType,
      disabilityLevel: req.body.disabilityLevel,
      monetaryAllowance: req.body.monetaryAllowance,
      assistedDevice: req.body.assistedDevice,
      donorDevice: req.body.donorDevice,
      governmentPrograms: req.body.governmentPrograms,
      status: parseStatus(req.body.status),
      remarks: req.body.remarks,
    };
    const record = await socialAmeliorationService.createPWDBeneficiary(payload);

    // Emit WebSocket event for new beneficiary
    emitBeneficiaryNew({
      beneficiaryId: record.id,
      type: 'PWD',
      citizenId: record.citizenId,
      status: record.status || undefined,
      programIds: record.governmentPrograms?.map((p: any) => p.id || p) || undefined,
      createdAt: record.createdAt,
    });

    res.status(201).json({ status: 'success', data: record });
  } catch (error: any) {
    res
      .status(400)
      .json({ status: 'error', message: error.message || 'Failed to create PWD beneficiary' });
  }
};

export const updatePWDBeneficiaryController = async (req: Request, res: Response) => {
  try {
    // Get old record to capture old status
    const oldRecord = await prisma.pWDBeneficiary.findUnique({
      where: { id: req.params.id },
    });
    const oldStatus = oldRecord?.status || undefined;

    const payload: UpdatePWDBeneficiaryData = {
      disabilityType: req.body.disabilityType,
      disabilityLevel: req.body.disabilityLevel,
      monetaryAllowance: req.body.monetaryAllowance,
      assistedDevice: req.body.assistedDevice,
      donorDevice: req.body.donorDevice,
      governmentPrograms: req.body.governmentPrograms,
      status: parseStatus(req.body.status),
      remarks: req.body.remarks,
    };
    const record = await socialAmeliorationService.updatePWDBeneficiary(req.params.id, payload);

    // Emit WebSocket event for beneficiary update
    emitBeneficiaryUpdate(req.params.id, 'PWD', {
      citizenId: record.citizenId,
      status: record.status || undefined,
      oldStatus,
      programIds: record.governmentPrograms?.map((p: any) => p.id || p) || undefined,
      updatedAt: record.updatedAt,
    });

    res.status(200).json({ status: 'success', data: record });
  } catch (error: any) {
    res
      .status(400)
      .json({ status: 'error', message: error.message || 'Failed to update PWD beneficiary' });
  }
};

export const deletePWDBeneficiaryController = async (req: Request, res: Response) => {
  try {
    // Get record before deletion to get citizenId
    const record = await prisma.pWDBeneficiary.findUnique({
      where: { id: req.params.id },
    });
    const citizenId = record?.citizenId;

    await socialAmeliorationService.deletePWDBeneficiary(req.params.id);

    // Emit WebSocket event for beneficiary deletion
    emitBeneficiaryDelete(req.params.id, 'PWD', citizenId);

    res.status(200).json({ status: 'success', message: 'PWD beneficiary removed successfully' });
  } catch (error: any) {
    res
      .status(400)
      .json({ status: 'error', message: error.message || 'Failed to remove PWD beneficiary' });
  }
};

export const getStudentBeneficiariesController = async (req: Request, res: Response) => {
  try {
    const result = await socialAmeliorationService.listStudentBeneficiaries(
      parseFilters(req),
      parsePagination(req)
    );
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error: any) {
    res
      .status(500)
      .json({ status: 'error', message: error.message || 'Failed to fetch student beneficiaries' });
  }
};

export const createStudentBeneficiaryController = async (req: Request, res: Response) => {
  try {
    const payload: CreateStudentBeneficiaryData = {
      citizenId: req.body.citizenId,
      gradeLevel: req.body.gradeLevel,
      programs: req.body.programs,
      status: parseStatus(req.body.status),
      remarks: req.body.remarks,
    };
    const record = await socialAmeliorationService.createStudentBeneficiary(payload);

    // Emit WebSocket event for new beneficiary
    emitBeneficiaryNew({
      beneficiaryId: record.id,
      type: 'STUDENT',
      citizenId: record.citizenId,
      status: record.status || undefined,
      programIds: record.programs?.map((p: any) => p.id || p) || undefined,
      createdAt: record.createdAt,
    });

    res.status(201).json({ status: 'success', data: record });
  } catch (error: any) {
    res
      .status(400)
      .json({ status: 'error', message: error.message || 'Failed to create student beneficiary' });
  }
};

export const updateStudentBeneficiaryController = async (req: Request, res: Response) => {
  try {
    // Get old record to capture old status
    const oldRecord = await prisma.studentBeneficiary.findUnique({
      where: { id: req.params.id },
    });
    const oldStatus = oldRecord?.status || undefined;

    const payload: UpdateStudentBeneficiaryData = {
      gradeLevel: req.body.gradeLevel,
      programs: req.body.programs,
      status: parseStatus(req.body.status),
      remarks: req.body.remarks,
    };
    const record = await socialAmeliorationService.updateStudentBeneficiary(req.params.id, payload);

    // Emit WebSocket event for beneficiary update
    emitBeneficiaryUpdate(req.params.id, 'STUDENT', {
      citizenId: record.citizenId,
      status: record.status || undefined,
      oldStatus,
      programIds: record.programs?.map((p: any) => p.id || p) || undefined,
      updatedAt: record.updatedAt,
    });

    res.status(200).json({ status: 'success', data: record });
  } catch (error: any) {
    res
      .status(400)
      .json({ status: 'error', message: error.message || 'Failed to update student beneficiary' });
  }
};

export const deleteStudentBeneficiaryController = async (req: Request, res: Response) => {
  try {
    // Get record before deletion to get citizenId
    const record = await prisma.studentBeneficiary.findUnique({
      where: { id: req.params.id },
    });
    const citizenId = record?.citizenId;

    await socialAmeliorationService.deleteStudentBeneficiary(req.params.id);

    // Emit WebSocket event for beneficiary deletion
    emitBeneficiaryDelete(req.params.id, 'STUDENT', citizenId);

    res
      .status(200)
      .json({ status: 'success', message: 'Student beneficiary removed successfully' });
  } catch (error: any) {
    res
      .status(400)
      .json({ status: 'error', message: error.message || 'Failed to remove student beneficiary' });
  }
};

export const getSoloParentBeneficiariesController = async (req: Request, res: Response) => {
  try {
    const result = await socialAmeliorationService.listSoloParentBeneficiaries(
      parseFilters(req),
      parsePagination(req)
    );
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error: any) {
    res
      .status(500)
      .json({
        status: 'error',
        message: error.message || 'Failed to fetch solo parent beneficiaries',
      });
  }
};

export const createSoloParentBeneficiaryController = async (req: Request, res: Response) => {
  try {
    const payload: CreateSoloParentBeneficiaryData = {
      citizenId: req.body.citizenId,
      category: req.body.category,
      assistancePrograms: req.body.assistancePrograms,
      status: parseStatus(req.body.status),
      remarks: req.body.remarks,
    };
    const record = await socialAmeliorationService.createSoloParentBeneficiary(payload);

    // Emit WebSocket event for new beneficiary
    emitBeneficiaryNew({
      beneficiaryId: record.id,
      type: 'SOLO_PARENT',
      citizenId: record.citizenId,
      status: record.status || undefined,
      programIds: record.assistancePrograms?.map((p: any) => p.id || p) || undefined,
      createdAt: record.createdAt,
    });

    res.status(201).json({ status: 'success', data: record });
  } catch (error: any) {
    res
      .status(400)
      .json({
        status: 'error',
        message: error.message || 'Failed to create solo parent beneficiary',
      });
  }
};

export const updateSoloParentBeneficiaryController = async (req: Request, res: Response) => {
  try {
    // Get old record to capture old status
    const oldRecord = await prisma.soloParentBeneficiary.findUnique({
      where: { id: req.params.id },
    });
    const oldStatus = oldRecord?.status || undefined;

    const payload: UpdateSoloParentBeneficiaryData = {
      category: req.body.category,
      assistancePrograms: req.body.assistancePrograms,
      status: parseStatus(req.body.status),
      remarks: req.body.remarks,
    };
    const record = await socialAmeliorationService.updateSoloParentBeneficiary(
      req.params.id,
      payload
    );

    // Emit WebSocket event for beneficiary update
    emitBeneficiaryUpdate(req.params.id, 'SOLO_PARENT', {
      citizenId: record.citizenId,
      status: record.status || undefined,
      oldStatus,
      programIds: record.assistancePrograms?.map((p: any) => p.id || p) || undefined,
      updatedAt: record.updatedAt,
    });

    res.status(200).json({ status: 'success', data: record });
  } catch (error: any) {
    res
      .status(400)
      .json({
        status: 'error',
        message: error.message || 'Failed to update solo parent beneficiary',
      });
  }
};

export const deleteSoloParentBeneficiaryController = async (req: Request, res: Response) => {
  try {
    // Get record before deletion to get citizenId
    const record = await prisma.soloParentBeneficiary.findUnique({
      where: { id: req.params.id },
    });
    const citizenId = record?.citizenId;

    await socialAmeliorationService.deleteSoloParentBeneficiary(req.params.id);

    // Emit WebSocket event for beneficiary deletion
    emitBeneficiaryDelete(req.params.id, 'SOLO_PARENT', citizenId);

    res
      .status(200)
      .json({ status: 'success', message: 'Solo parent beneficiary removed successfully' });
  } catch (error: any) {
    res
      .status(400)
      .json({
        status: 'error',
        message: error.message || 'Failed to remove solo parent beneficiary',
      });
  }
};

export const getOverviewStatsController = async (_req: Request, res: Response) => {
  try {
    const stats = await socialAmeliorationService.getOverviewStats();
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    res
      .status(500)
      .json({ status: 'error', message: error.message || 'Failed to fetch overview statistics' });
  }
};

export const getTrendStatsController = async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as 'daily' | 'monthly' | 'yearly') || 'monthly';
    const stats = await socialAmeliorationService.getTrendStats(range);
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    res
      .status(500)
      .json({ status: 'error', message: error.message || 'Failed to fetch trend statistics' });
  }
};
