import prisma from '../config/database';
import { CustomError } from '../middleware/error';

export interface ResidentCertificateTemplate {
  id: string;
  name: string;
  description: string | null;
  certificateType: string;
}

export const getActiveCertificateTemplatesForResident = async (
  residentId: string
): Promise<ResidentCertificateTemplate[]> => {
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { id: true, barangay: { select: { municipalityId: true } } },
  });

  if (!resident) {
    throw new CustomError('Resident not found', 404);
  }

  const municipalityId = resident.barangay?.municipalityId;
  if (!municipalityId) {
    throw new CustomError('Resident must have a barangay before requesting certificates', 400);
  }

  return prisma.certificateTemplate.findMany({
    where: { municipalityId, isActive: true },
    select: { id: true, name: true, description: true, certificateType: true },
    orderBy: { name: 'asc' },
  });
};
