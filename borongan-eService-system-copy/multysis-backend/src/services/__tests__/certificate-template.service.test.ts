import prisma from '../../config/database';
import { getActiveCertificateTemplatesForResident } from '../certificate-template.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    resident: { findUnique: jest.fn() },
    certificateTemplate: { findMany: jest.fn() },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('certificate-template.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only public fields for active templates in the resident municipality', async () => {
    (mockedPrisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: 'resident-1',
      barangay: { municipalityId: 7 },
    });
    (mockedPrisma.certificateTemplate.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'template-1',
        name: 'Barangay Clearance',
        description: 'Clearance template',
        certificateType: 'barangay_clearance',
      },
    ]);

    await expect(getActiveCertificateTemplatesForResident('resident-1')).resolves.toEqual([
      {
        id: 'template-1',
        name: 'Barangay Clearance',
        description: 'Clearance template',
        certificateType: 'barangay_clearance',
      },
    ]);

    expect(mockedPrisma.certificateTemplate.findMany).toHaveBeenCalledWith({
      where: { municipalityId: 7, isActive: true },
      select: { id: true, name: true, description: true, certificateType: true },
      orderBy: { name: 'asc' },
    });
  });

  it('rejects residents without a barangay', async () => {
    (mockedPrisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: 'resident-1',
      barangay: null,
    });

    await expect(getActiveCertificateTemplatesForResident('resident-1')).rejects.toThrow(
      'Resident must have a barangay before requesting certificates'
    );
  });
});
