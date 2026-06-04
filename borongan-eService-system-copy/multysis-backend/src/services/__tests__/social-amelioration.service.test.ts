import { socialAmeliorationService } from '../social-amelioration.service';
import prisma from '../../config/database';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    seniorCitizenBeneficiary: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
    },
    pWDBeneficiary: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
    },
    studentBeneficiary: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
    },
    soloParentBeneficiary: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
    },
    beneficiaryProgramPivot: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
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

      // Classification details batch fetch via $queryRawUnsafe (batch method)
      mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { resident_id: 'res-1', classification_details: { pensionTypes: ['pension-1'], remarks: null } },
        { resident_id: 'res-2', classification_details: { pensionTypes: [], remarks: null } },
      ]);

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

      // pensionTypes now come from classification_details
      expect(result.data[0].pensionTypes).toEqual(['pension-1']);
      expect(result.data[1].pensionTypes).toEqual([]);

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

      mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { resident_id: 'res-3', classification_details: { pensionTypes: [], remarks: null } },
      ]);
      mockedPrisma.seniorCitizenBeneficiary.findMany.mockResolvedValue(mockSeniors);
      mockedPrisma.seniorCitizenBeneficiary.count.mockResolvedValue(1);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue([]);

      const result = await socialAmeliorationService.listSeniorBeneficiaries();

      expect(result.data[0].governmentPrograms).toEqual([]);
      expect(result.data[0].pensionTypes).toEqual([]);
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
          monetaryAllowance: false,
          assistedDevice: false,
          donorDevice: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-1',
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
          monetaryAllowance: true,
          assistedDevice: true,
          donorDevice: 'NGO',
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-2',
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

      // Mock $queryRawUnsafe for classification_details batch fetch
      mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { resident_id: 'res-1', classification_details: { disabilityType: 'Visual', disabilityLevel: 'Moderate', remarks: null } },
        { resident_id: 'res-2', classification_details: { disabilityType: 'Physical', disabilityLevel: 'Severe', remarks: null } },
      ]);

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

      // disabilityType now comes from classification_details
      expect(result.data[0].disabilityType).toEqual('Visual');
      expect(result.data[1].disabilityType).toEqual('Physical');
    });
  });

  describe('listStudentBeneficiaries', () => {
    it('should batch-fetch programs in one query instead of N queries', async () => {
      const mockStudents = [
        {
          id: 'stu-1',
          studentId: 'ST-2026-001',
          status: 'ACTIVE',
          remarks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-1',
          resident: {
            id: 'res-1',
            firstName: 'Carlo',
            lastName: 'Tan',
            middleName: null,
            extensionName: null,
            picturePath: null,
            proofOfIdentification: null,
          },
        },
      ];

      const mockProgramPivots = [
        { beneficiaryId: 'stu-1', programId: 'prog-edu' },
      ];

      // Mock $queryRawUnsafe for classification_details batch fetch
      mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { resident_id: 'res-1', classification_details: { gradeLevel: 'Grade 10', remarks: null } },
      ]);

      mockedPrisma.studentBeneficiary.findMany.mockResolvedValue(mockStudents);
      mockedPrisma.studentBeneficiary.count.mockResolvedValue(1);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue(mockProgramPivots);

      const result = await socialAmeliorationService.listStudentBeneficiaries();

      expect(mockedPrisma.beneficiaryProgramPivot.findMany).toHaveBeenCalledTimes(1);
      expect(mockedPrisma.beneficiaryProgramPivot.findMany).toHaveBeenCalledWith({
        where: {
          beneficiaryType: 'STUDENT',
          beneficiaryId: { in: ['stu-1'] },
        },
        select: { beneficiaryId: true, programId: true },
      });

      // IMPORTANT: Student formatter uses `programs` key, NOT `governmentPrograms`
      expect(result.data[0].programs).toEqual(['prog-edu']);
      // gradeLevel now comes from classification_details
      expect(result.data[0].gradeLevel).toEqual('Grade 10');
    });
  });

  describe('listSoloParentBeneficiaries', () => {
    it('should batch-fetch programs in one query instead of N queries', async () => {
      const mockSoloParents = [
        {
          id: 'sp-1',
          soloParentId: 'SP-2026-001',
          status: 'ACTIVE',
          remarks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-1',
          resident: {
            id: 'res-1',
            firstName: 'Elena',
            lastName: 'Cruz',
            middleName: null,
            extensionName: null,
            picturePath: null,
            proofOfIdentification: null,
          },
        },
        {
          id: 'sp-2',
          soloParentId: 'SP-2026-002',
          status: 'ACTIVE',
          remarks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          residentId: 'res-2',
          resident: {
            id: 'res-2',
            firstName: 'Luz',
            lastName: 'Ramos',
            middleName: null,
            extensionName: null,
            picturePath: null,
            proofOfIdentification: null,
          },
        },
      ];

      const mockProgramPivots = [
        { beneficiaryId: 'sp-2', programId: 'prog-assist' },
      ];

      // Mock $queryRawUnsafe for classification_details batch fetch
      mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { resident_id: 'res-1', classification_details: { category: 'Widowed', remarks: null } },
        { resident_id: 'res-2', classification_details: { category: 'Separated', remarks: null } },
      ]);

      mockedPrisma.soloParentBeneficiary.findMany.mockResolvedValue(mockSoloParents);
      mockedPrisma.soloParentBeneficiary.count.mockResolvedValue(2);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue(mockProgramPivots);

      const result = await socialAmeliorationService.listSoloParentBeneficiaries();

      expect(mockedPrisma.beneficiaryProgramPivot.findMany).toHaveBeenCalledTimes(1);
      expect(mockedPrisma.beneficiaryProgramPivot.findMany).toHaveBeenCalledWith({
        where: {
          beneficiaryType: 'SOLO_PARENT',
          beneficiaryId: { in: ['sp-1', 'sp-2'] },
        },
        select: { beneficiaryId: true, programId: true },
      });

      // IMPORTANT: Solo parent formatter uses `assistancePrograms` key
      expect(result.data[0].assistancePrograms).toEqual([]);
      expect(result.data[1].assistancePrograms).toEqual(['prog-assist']);

      // category now comes from classification_details
      expect(result.data[0].category).toEqual('Widowed');
      expect(result.data[1].category).toEqual('Separated');
    });
  });
});
