import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getFilePath, getFileUrl } from '../middleware/upload';
import {
    activateCitizen,
    approveCitizen,
    createCitizen,
    deactivateCitizen,
    getCitizen,
    getCitizens,
    isUsernameAvailable,
    rejectCitizen,
    removeCitizen,
    updateCitizen,
} from '../services/citizen.service';
import {
    emitCitizenNew,
    emitCitizenStatusChange,
    emitCitizenUpdate,
} from '../services/socket.service';

// Helper function to format beneficiary data from citizen
const formatBeneficiaryInfo = async (
  citizen: any
): Promise<{
  beneficiaryInfo?: Array<{
    type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
    programIds: string[];
    programNames: string[];
    programTypes: string[];
  }>;
  isBeneficiary: boolean;
}> => {
  const beneficiaryInfo: Array<{
    type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
    programIds: string[];
    programNames: string[];
    programTypes: string[];
  }> = [];

  // Helper to fetch programs for a beneficiary
  const getProgramsForBeneficiary = async (
    beneficiaryType: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT',
    beneficiaryId: string
  ) => {
    const pivots = await (prisma as any).beneficiaryProgramPivot.findMany({
      where: {
        beneficiaryType: beneficiaryType,
        beneficiaryId: beneficiaryId,
      },
      include: {
        program: true,
      },
    });

    // Also include ALL type programs
    const allTypePrograms = await prisma.governmentProgram.findMany({
      where: {
        type: 'ALL',
        isActive: true,
      },
    });

    // Combine and deduplicate
    const assignedPrograms = pivots.map((p: any) => p.program);
    const assignedIds = new Set(assignedPrograms.map((p: any) => p.id));

    return {
      assigned: assignedPrograms,
      all: allTypePrograms.filter((p) => !assignedIds.has(p.id)),
    };
  };

  // Process Senior Citizen beneficiary
  if (citizen.seniorCitizenBeneficiary) {
    const { assigned, all } = await getProgramsForBeneficiary(
      'SENIOR_CITIZEN',
      citizen.seniorCitizenBeneficiary.id
    );
    const allPrograms = [...assigned, ...all];
    const programIds = allPrograms.map((p: any) => p.id);
    const programNames = allPrograms.map((p: any) => p.name).filter(Boolean);
    const programTypes = allPrograms.map((p: any) => p.type).filter(Boolean);
    beneficiaryInfo.push({
      type: 'SENIOR_CITIZEN',
      programIds,
      programNames,
      programTypes,
    });
  }

  // Process PWD beneficiary
  if (citizen.pwdBeneficiary) {
    const { assigned, all } = await getProgramsForBeneficiary('PWD', citizen.pwdBeneficiary.id);
    const allPrograms = [...assigned, ...all];
    const programIds = allPrograms.map((p: any) => p.id);
    const programNames = allPrograms.map((p: any) => p.name).filter(Boolean);
    const programTypes = allPrograms.map((p: any) => p.type).filter(Boolean);
    beneficiaryInfo.push({
      type: 'PWD',
      programIds,
      programNames,
      programTypes,
    });
  }

  // Process Student beneficiary
  if (citizen.studentBeneficiary) {
    const { assigned, all } = await getProgramsForBeneficiary(
      'STUDENT',
      citizen.studentBeneficiary.id
    );
    const allPrograms = [...assigned, ...all];
    const programIds = allPrograms.map((p: any) => p.id);
    const programNames = allPrograms.map((p: any) => p.name).filter(Boolean);
    const programTypes = allPrograms.map((p: any) => p.type).filter(Boolean);
    beneficiaryInfo.push({
      type: 'STUDENT',
      programIds,
      programNames,
      programTypes,
    });
  }

  // Process Solo Parent beneficiary
  if (citizen.soloParentBeneficiary) {
    const { assigned, all } = await getProgramsForBeneficiary(
      'SOLO_PARENT',
      citizen.soloParentBeneficiary.id
    );
    const allPrograms = [...assigned, ...all];
    const programIds = allPrograms.map((p: any) => p.id);
    const programNames = allPrograms.map((p: any) => p.name).filter(Boolean);
    const programTypes = allPrograms.map((p: any) => p.type).filter(Boolean);
    beneficiaryInfo.push({
      type: 'SOLO_PARENT',
      programIds,
      programNames,
      programTypes,
    });
  }

  return {
    beneficiaryInfo: beneficiaryInfo.length > 0 ? beneficiaryInfo : undefined,
    isBeneficiary: beneficiaryInfo.length > 0,
  };
};

// Helper function to format citizen data for API response
const formatCitizenResponse = async (citizen: any) => {
  if (!citizen) return null;

  // Format beneficiary data
  const { beneficiaryInfo, isBeneficiary } = await formatBeneficiaryInfo(citizen);

  // Transform relative paths to full URLs
  const formatted = {
    ...citizen,
    citizenPicture: citizen.citizenPicture ? getFileUrl(citizen.citizenPicture) : null,
    proofOfResidency: citizen.proofOfResidency ? getFileUrl(citizen.proofOfResidency) : null,
    proofOfIdentification: citizen.proofOfIdentification
      ? getFileUrl(citizen.proofOfIdentification)
      : null,
    beneficiaryInfo,
    isBeneficiary,
  };

  // Transform placeOfBirth array to citizenPlaceOfBirth object for frontend compatibility
  // In the DB, it's a 1-to-many relation, but logically it's 1-to-1 for citizens
  if (citizen.placeOfBirth && Array.isArray(citizen.placeOfBirth) && citizen.placeOfBirth.length > 0) {
    const pob = citizen.placeOfBirth[0];
    formatted.citizenPlaceOfBirth = {
      region: pob.region,
      province: pob.province,
      municipality: pob.municipality,
    };
  } else if (citizen.placeOfBirth && !Array.isArray(citizen.placeOfBirth)) {
    // Fallback if it's already an object (though Prisma should return array for this relation)
    formatted.citizenPlaceOfBirth = {
      region: citizen.placeOfBirth.region,
      province: citizen.placeOfBirth.province,
      municipality: citizen.placeOfBirth.municipality,
    };
  }

  return formatted;
};

export const createCitizenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Log received files for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Files received:', {
        citizenPicture: files.citizenPicture?.[0]?.filename || 'none',
        proofOfResidency: files.proofOfResidency?.[0]?.filename || 'none',
        proofOfIdentification: files.proofOfIdentification?.[0]?.filename || 'none',
      });
    }

    // Extract file paths (store relative paths in DB)
    const citizenPicture = files.citizenPicture?.[0]
      ? getFilePath(files.citizenPicture[0].filename, 'image')
      : undefined;
    const proofOfResidency = files.proofOfResidency?.[0]
      ? getFilePath(files.proofOfResidency[0].filename, 'document')
      : undefined;
    const proofOfIdentification = files.proofOfIdentification?.[0]
      ? getFilePath(files.proofOfIdentification[0].filename, 'document')
      : undefined;

    // Parse boolean values from FormData (they come as strings)
    const parseBoolean = (value: any): boolean | undefined => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);
    };

    const citizen = await createCitizen({
      ...req.body,
      birthDate: new Date(req.body.birthDate),
      citizenPicture,
      proofOfResidency,
      proofOfIdentification,
      isResident: parseBoolean(req.body.isResident),
      isVoter: parseBoolean(req.body.isVoter),
      isEmployed: parseBoolean(req.body.isEmployed),
    });

    // Format citizen for response
    const formattedCitizen = await formatCitizenResponse(citizen);

    // Emit WebSocket event for new citizen registration
    emitCitizenNew({
      id: citizen.id,
      firstName: citizen.firstName,
      middleName: citizen.middleName || undefined,
      lastName: citizen.lastName,
      extensionName: citizen.extensionName || undefined,
      status: citizen.residencyStatus,
      createdAt: citizen.createdAt,
    });

    res.status(201).json({
      status: 'success',
      data: formattedCitizen,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create citizen',
    });
  }
};

export const getCitizensController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 10;
    const search = _req.query.search as string;
    const status = _req.query.status as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' | undefined;

    const result = await getCitizens({ search, status }, { page, limit });

    // Transform relative paths to full URLs and format citizen data
    const citizensWithUrls = await Promise.all(
      result.citizens.map(async (citizen) => {
        return await formatCitizenResponse(citizen);
      })
    );

    res.status(200).json({
      status: 'success',
      data: citizensWithUrls,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch citizens',
    });
  }
};

export const getCitizenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const citizen = await getCitizen(req.params.id);

    // Format citizen for response
    const formattedCitizen = await formatCitizenResponse(citizen);

    res.status(200).json({
      status: 'success',
      data: formattedCitizen,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Citizen not found',
    });
  }
};

export const updateCitizenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get old citizen to capture old status
    const oldCitizen = await getCitizen(req.params.id);
    const oldStatus = oldCitizen?.residencyStatus;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Log received files for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Update - Files received:', {
        citizenPicture: files.citizenPicture?.[0]?.filename || 'none',
        proofOfResidency: files.proofOfResidency?.[0]?.filename || 'none',
        proofOfIdentification: files.proofOfIdentification?.[0]?.filename || 'none',
      });
      // Log all file fieldnames to see what multer actually received
      console.log('All file fieldnames:', Object.keys(files || {}));
      // Log detailed file info for each field
      Object.keys(files || {}).forEach((fieldname) => {
        console.log(
          `Field "${fieldname}":`,
          files[fieldname]?.map((f) => ({
            filename: f.filename,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
          }))
        );
      });
    }

    // Exclude ALL file-related fields from req.body to prevent conflicts
    // This ensures file fields are ONLY set from req.files, never from req.body
    const {
      citizenPicture,
      proofOfResidency,
      proofOfIdentification,
      citizenPictureFile,
      proofOfResidencyFile,
      proofOfIdentificationFile,
      ...bodyData
    } = req.body;

    const updateData: any = { ...bodyData };

    // Explicitly remove file fields from updateData to ensure they're not accidentally included
    delete updateData.citizenPicture;
    delete updateData.proofOfResidency;
    delete updateData.proofOfIdentification;

    if (req.body.birthDate) {
      updateData.birthDate = new Date(req.body.birthDate);
    }

    // Parse boolean values from FormData (they come as strings)
    const parseBoolean = (value: any): boolean | undefined => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);
    };

    // Convert boolean strings to actual booleans
    if (req.body.isResident !== undefined) {
      updateData.isResident = parseBoolean(req.body.isResident);
    }
    if (req.body.isVoter !== undefined) {
      updateData.isVoter = parseBoolean(req.body.isVoter);
    }
    if (req.body.isEmployed !== undefined) {
      updateData.isEmployed = parseBoolean(req.body.isEmployed);
    }

    // Extract file paths ONLY if files were actually uploaded (store relative paths in DB)
    // Each field is checked independently and isolated to prevent cross-contamination
    // Only update the specific field if a file was uploaded for that field
    if (files?.citizenPicture?.[0]) {
      updateData.citizenPicture = getFilePath(files.citizenPicture[0].filename, 'image');
      if (process.env.NODE_ENV === 'development') {
        console.log('Setting citizenPicture:', updateData.citizenPicture);
      }
    }
    if (files?.proofOfResidency?.[0]) {
      updateData.proofOfResidency = getFilePath(files.proofOfResidency[0].filename, 'document');
      if (process.env.NODE_ENV === 'development') {
        console.log('Setting proofOfResidency:', updateData.proofOfResidency);
      }
    }
    if (files?.proofOfIdentification?.[0]) {
      updateData.proofOfIdentification = getFilePath(
        files.proofOfIdentification[0].filename,
        'document'
      );
      if (process.env.NODE_ENV === 'development') {
        console.log('Setting proofOfIdentification:', updateData.proofOfIdentification);
      }
    }

    const citizen = await updateCitizen(req.params.id, updateData);

    // Format citizen for response
    const formattedCitizen = await formatCitizenResponse(citizen);

    // Emit WebSocket event for citizen update
    emitCitizenUpdate(req.params.id, {
      firstName: citizen.firstName,
      middleName: citizen.middleName || undefined,
      lastName: citizen.lastName,
      extensionName: citizen.extensionName || undefined,
      status: citizen.residencyStatus,
      oldStatus,
      updatedAt: citizen.updatedAt,
    });

    res.status(200).json({
      status: 'success',
      data: formattedCitizen,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update citizen',
    });
  }
};

export const approveCitizenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get old citizen to capture old status
    const oldCitizen = await getCitizen(req.params.id);
    const oldStatus = oldCitizen?.residencyStatus || 'PENDING';

    const { remarks } = req.body;
    const citizen = await approveCitizen(req.params.id, remarks);

    // Format citizen for response
    const formattedCitizen = await formatCitizenResponse(citizen);

    // Emit WebSocket event for citizen status change
    emitCitizenStatusChange(req.params.id, oldStatus, citizen.residencyStatus, 'approve', remarks);

    res.status(200).json({
      status: 'success',
      data: formattedCitizen,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to approve citizen',
    });
  }
};

export const rejectCitizenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get old citizen to capture old status
    const oldCitizen = await getCitizen(req.params.id);
    const oldStatus = oldCitizen?.residencyStatus || 'PENDING';

    const { remarks } = req.body;
    const citizen = await rejectCitizen(req.params.id, remarks);

    // Format citizen for response
    const formattedCitizen = await formatCitizenResponse(citizen);

    // Emit WebSocket event for citizen status change
    emitCitizenStatusChange(req.params.id, oldStatus, citizen.residencyStatus, 'reject', remarks);

    res.status(200).json({
      status: 'success',
      data: formattedCitizen,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to reject citizen',
    });
  }
};

export const removeCitizenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { remarks } = req.body;
    const result = await removeCitizen(req.params.id, remarks);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Citizen removed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to remove citizen',
    });
  }
};

export const checkUsernameAvailabilityController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.query;
    const excludeId = req.query.excludeId as string | undefined;

    if (!username || typeof username !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Username is required',
      });
      return;
    }

    const available = await isUsernameAvailable(username, excludeId);
    res.status(200).json({
      status: 'success',
      data: { available },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to check username availability',
    });
  }
};

export const activateCitizenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get old citizen to capture old status
    const oldCitizen = await getCitizen(req.params.id);
    const oldStatus = oldCitizen?.residencyStatus || 'INACTIVE';

    const citizen = await activateCitizen(req.params.id);

    // Format citizen for response
    const formattedCitizen = await formatCitizenResponse(citizen);

    // Emit WebSocket event for citizen status change
    emitCitizenStatusChange(req.params.id, oldStatus, citizen.residencyStatus, 'activate');

    res.status(200).json({
      status: 'success',
      data: formattedCitizen,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to activate citizen',
    });
  }
};

export const deactivateCitizenController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Get old citizen to capture old status
    const oldCitizen = await getCitizen(req.params.id);
    const oldStatus = oldCitizen?.residencyStatus || 'ACTIVE';

    const citizen = await deactivateCitizen(req.params.id);

    // Format citizen for response
    const formattedCitizen = await formatCitizenResponse(citizen);

    // Emit WebSocket event for citizen status change
    emitCitizenStatusChange(req.params.id, oldStatus, citizen.residencyStatus, 'deactivate');

    res.status(200).json({
      status: 'success',
      data: formattedCitizen,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to deactivate citizen',
    });
  }
};
