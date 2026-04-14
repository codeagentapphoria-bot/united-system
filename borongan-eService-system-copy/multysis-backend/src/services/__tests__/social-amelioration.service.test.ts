import { socialAmeliorationService } from '../social-amelioration.service';
import prisma from '../../config/database';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    seniorCitizenBeneficiary: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pWDBeneficiary: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    studentBeneficiary: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    soloParentBeneficiary: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    beneficiaryProgramPivot: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../middleware/upload', () => ({
  getFileUrl: (path: string) => `http://test/${path}`,
}));

const mockedPrisma = prisma as any;

describe('Social Amelioration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export socialAmeliorationService', () => {
    expect(socialAmeliorationService).toBeDefined();
    expect(typeof socialAmeliorationService.listSeniorBeneficiaries).toBe('function');
  });

  describe('listSeniorBeneficiaries', () => {
    it('should batch-fetch programs in one query instead of N queries', async () => {
      const mockSeniors = [
        {
          id: 'senior-1',
          seniorCitizenId: 'SC-2026-001',
          status: 'ACTIVE',
          remarks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-1',
          pensionTypes: [{ settingId: 'pension-1', setting: { name: 'GSIS' } }],
          resident: {
            id: 'res-1',
            firstName: 'Juan',
            lastName: 'Dela Cruz',
            middleName: null,
            extensionName: null,
            picturePath: null,
            proofOfIdentification: null,
          },
        },
        {
          id: 'senior-2',
          seniorCitizenId: 'SC-2026-002',
          status: 'ACTIVE',
          remarks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-2',
          pensionTypes: [],
          resident: {
            id: 'res-2',
            firstName: 'Maria',
            lastName: 'Santos',
            middleName: null,
            extensionName: null,
            picturePath: 'pic.jpg',
            proofOfIdentification: null,
          },
        },
      ];

      const mockProgramPivots = [
        { beneficiaryId: 'senior-1', programId: 'prog-a' },
        { beneficiaryId: 'senior-1', programId: 'prog-b' },
        { beneficiaryId: 'senior-2', programId: 'prog-c' },
      ];

      mockedPrisma.seniorCitizenBeneficiary.findMany.mockResolvedValue(mockSeniors);
      mockedPrisma.seniorCitizenBeneficiary.count.mockResolvedValue(2);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue(mockProgramPivots);

      const result = await socialAmeliorationService.listSeniorBeneficiaries();

      // The batch helper should be called ONCE with both IDs
      expect(mockedPrisma.beneficiaryProgramPivot.findMany).toHaveBeenCalledTimes(1);
      expect(mockedPrisma.beneficiaryProgramPivot.findMany).toHaveBeenCalledWith({
        where: {
          beneficiaryType: 'SENIOR_CITIZEN',
          beneficiaryId: { in: ['senior-1', 'senior-2'] },
        },
        select: { beneficiaryId: true, programId: true },
      });

      // Programs should be correctly distributed
      expect(result.data[0].governmentPrograms).toEqual(['prog-a', 'prog-b']);
      expect(result.data[1].governmentPrograms).toEqual(['prog-c']);

      // Pagination should still work
      expect(result.pagination.total).toBe(2);
    });

    it('should return empty programs for beneficiaries with no program pivots', async () => {
      const mockSeniors = [
        {
          id: 'senior-3',
          seniorCitizenId: 'SC-2026-003',
          status: 'ACTIVE',
          remarks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-3',
          pensionTypes: [],
          resident: {
            id: 'res-3',
            firstName: 'Ana',
            lastName: 'Reyes',
            middleName: null,
            extensionName: null,
            picturePath: null,
            proofOfIdentification: null,
          },
        },
      ];

      mockedPrisma.seniorCitizenBeneficiary.findMany.mockResolvedValue(mockSeniors);
      mockedPrisma.seniorCitizenBeneficiary.count.mockResolvedValue(1);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue([]);

      const result = await socialAmeliorationService.listSeniorBeneficiaries();

      expect(result.data[0].governmentPrograms).toEqual([]);
    });
  });

  describe('listPWDBeneficiaries', () => {
    it('should batch-fetch programs in one query instead of N queries', async () => {
      const mockPWDs = [
        {
          id: 'pwd-1',
          pwdId: 'PWD-2026-001',
          status: 'ACTIVE',
          remarks: null,
          disabilityLevel: 'Moderate',
          disabilityTypeId: 'dt-1',
          monetaryAllowance: false,
          assistedDevice: false,
          donorDevice: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-1',
          disabilityType: { id: 'dt-1', name: 'Visual' },
          resident: {
            id: 'res-1',
            firstName: 'Pedro',
            lastName: 'Garcia',
            middleName: null,
            extensionName: null,
            picturePath: null,
            proofOfIdentification: null,
          },
        },
        {
          id: 'pwd-2',
          pwdId: 'PWD-2026-002',
          status: 'ACTIVE',
          remarks: null,
          disabilityLevel: 'Severe',
          disabilityTypeId: 'dt-2',
          monetaryAllowance: true,
          assistedDevice: true,
          donorDevice: 'NGO',
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-2',
          disabilityType: { id: 'dt-2', name: 'Physical' },
          resident: {
            id: 'res-2',
            firstName: 'Rosa',
            lastName: 'Lim',
            middleName: null,
            extensionName: null,
            picturePath: null,
            proofOfIdentification: null,
          },
        },
      ];

      const mockProgramPivots = [
        { beneficiaryId: 'pwd-1', programId: 'prog-x' },
        { beneficiaryId: 'pwd-2', programId: 'prog-y' },
        { beneficiaryId: 'pwd-2', programId: 'prog-z' },
      ];

      mockedPrisma.pWDBeneficiary.findMany.mockResolvedValue(mockPWDs);
      mockedPrisma.pWDBeneficiary.count.mockResolvedValue(2);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue(mockProgramPivots);

      const result = await socialAmeliorationService.listPWDBeneficiaries();

      expect(mockedPrisma.beneficiaryProgramPivot.findMany).toHaveBeenCalledTimes(1);
      expect(mockedPrisma.beneficiaryProgramPivot.findMany).toHaveBeenCalledWith({
        where: {
          beneficiaryType: 'PWD',
          beneficiaryId: { in: ['pwd-1', 'pwd-2'] },
        },
        select: { beneficiaryId: true, programId: true },
      });

      expect(result.data[0].governmentPrograms).toEqual(['prog-x']);
      expect(result.data[1].governmentPrograms).toEqual(['prog-y', 'prog-z']);
    });
  });
});
