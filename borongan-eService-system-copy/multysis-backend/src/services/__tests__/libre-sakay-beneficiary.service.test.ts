import prisma from '../../config/database';
import {
  listBeneficiaries,
  getBeneficiaryById,
  suspendBeneficiary,
  activateBeneficiary,
  removeBeneficiary,
} from '../libre-sakay-beneficiary.service';

const mockedPrisma = prisma as any;

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    governmentProgramApplication: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    beneficiaryProgramPivot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Libre Sakay Beneficiary Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // listBeneficiaries
  // ────────────────────────────────────────────────────────────────────────────

  describe('listBeneficiaries', () => {
    it('should return empty data when no applications exist', async () => {
      mockedPrisma.governmentProgramApplication.findMany.mockResolvedValue([]);
      mockedPrisma.governmentProgramApplication.count.mockResolvedValue(0);

      const result = await listBeneficiaries('all', 1, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should map senior citizen beneficiary to enrollment ACTIVE', async () => {
      const mockRow = {
        id: 'app-1',
        residentId: 'res-1',
        programId: 'gp-all-libre-sakay',
        status: 'approved',
        appliedAt: new Date(),
        reviewedAt: new Date(),
        resident: {
          id: 'res-1',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          middleName: null,
          extensionName: null,
          residentId: null,
          seniorCitizenBeneficiary: { id: 'sc-1' },
          pwdBeneficiary: null,
          studentBeneficiary: null,
          soloParentBeneficiary: null,
          barangay: { barangayName: 'Brgy. 1', municipality: { municipalityName: 'Borongan' } },
        },
      };

      mockedPrisma.governmentProgramApplication.findMany.mockResolvedValue([mockRow]);
      mockedPrisma.governmentProgramApplication.count.mockResolvedValue(1);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue([
        { beneficiaryType: 'SENIOR_CITIZEN', beneficiaryId: 'sc-1', status: 'active', suspendedAt: null },
      ]);

      const result = await listBeneficiaries('all', 1, 20);

      expect(result.data.length).toBe(1);
      expect(result.data[0].enrollmentStatus).toBe('ACTIVE');
      expect(result.data[0].category).toBe('SENIOR_CITIZEN');
    });

    it('should filter by search term on resident name', async () => {
      mockedPrisma.governmentProgramApplication.findMany.mockResolvedValue([]);
      mockedPrisma.governmentProgramApplication.count.mockResolvedValue(0);

      await listBeneficiaries('all', 1, 20, 'Juan');

      expect(mockedPrisma.governmentProgramApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resident: expect.objectContaining({
              OR: expect.arrayContaining([
                { firstName: { contains: 'Juan', mode: 'insensitive' } },
              ]),
            }),
          }),
        })
      );
    });

    it('should filter active enrollment only', async () => {
      const mockRow = {
        id: 'app-1',
        residentId: 'res-1',
        programId: 'gp-all-libre-sakay',
        status: 'approved',
        appliedAt: new Date(),
        reviewedAt: new Date(),
        resident: {
          id: 'res-1',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          middleName: null,
          extensionName: null,
          residentId: null,
          seniorCitizenBeneficiary: { id: 'sc-1' },
          pwdBeneficiary: null,
          studentBeneficiary: null,
          soloParentBeneficiary: null,
          barangay: { barangayName: 'Brgy. 1', municipality: { municipalityName: 'Borongan' } },
        },
      };

      mockedPrisma.governmentProgramApplication.findMany.mockResolvedValue([mockRow]);
      mockedPrisma.governmentProgramApplication.count.mockResolvedValue(1);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue([
        { beneficiaryType: 'SENIOR_CITIZEN', beneficiaryId: 'sc-1', status: 'active', suspendedAt: null },
      ]);

      const result = await listBeneficiaries('active', 1, 20);

      expect(result.data.length).toBe(1);
    });

    it('should mark PENDING when no pivot row exists', async () => {
      const mockRow = {
        id: 'app-1',
        residentId: 'res-1',
        programId: 'gp-all-libre-sakay',
        status: 'approved',
        appliedAt: new Date(),
        reviewedAt: new Date(),
        resident: {
          id: 'res-1',
          firstName: 'Maria',
          lastName: 'Santos',
          middleName: null,
          extensionName: null,
          residentId: null,
          seniorCitizenBeneficiary: { id: 'sc-1' },
          pwdBeneficiary: null,
          studentBeneficiary: null,
          soloParentBeneficiary: null,
          barangay: { barangayName: 'Brgy. 2', municipality: { municipalityName: 'Borongan' } },
        },
      };

      mockedPrisma.governmentProgramApplication.findMany.mockResolvedValue([mockRow]);
      mockedPrisma.governmentProgramApplication.count.mockResolvedValue(1);
      mockedPrisma.beneficiaryProgramPivot.findMany.mockResolvedValue([]);

      const result = await listBeneficiaries('all', 1, 20);

      expect(result.data[0].enrollmentStatus).toBe('PENDING');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // getBeneficiaryById
  // ────────────────────────────────────────────────────────────────────────────

  describe('getBeneficiaryById', () => {
    it('should return null when application not found', async () => {
      mockedPrisma.governmentProgramApplication.findUnique.mockResolvedValue(null);

      const result = await getBeneficiaryById('non-existent');

      expect(result).toBeNull();
    });

    it('should return beneficiary details with pivot info', async () => {
      const mockRow = {
        id: 'app-1',
        residentId: 'res-1',
        programId: 'gp-all-libre-sakay',
        status: 'approved',
        appliedAt: new Date('2026-01-15'),
        reviewedAt: new Date('2026-01-20'),
        resident: {
          id: 'res-1',
          firstName: 'Pedro',
          lastName: 'Penduko',
          middleName: 'B',
          extensionName: 'Sr',
          residentId: 'RES-2026-0000001',
          picturePath: '/pics/pedro.jpg',
          birthdate: new Date('1960-05-10'),
          sex: 'Male',
          barangay: { barangayName: 'Brgy. 3', municipality: { municipalityName: 'Borongan' } },
          seniorCitizenBeneficiary: { id: 'sc-1' },
          pwdBeneficiary: null,
          studentBeneficiary: null,
          soloParentBeneficiary: null,
        },
        adminNotes: null,
        submittedData: { name: 'Pedro' },
        attachments: {},
      };

      mockedPrisma.governmentProgramApplication.findUnique.mockResolvedValue(mockRow);
      mockedPrisma.beneficiaryProgramPivot.findFirst.mockResolvedValue({
        beneficiaryType: 'SENIOR_CITIZEN',
        beneficiaryId: 'sc-1',
        status: 'suspended',
        suspendedAt: new Date('2026-02-01'),
      });

      const result = await getBeneficiaryById('app-1');

      expect(result).not.toBeNull();
      expect(result!.enrollmentStatus).toBe('INACTIVE');
      expect(result!.fullName).toBe('Pedro B Penduko Sr');
      expect(result!.suspendedAt).not.toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // suspendBeneficiary
  // ────────────────────────────────────────────────────────────────────────────

  describe('suspendBeneficiary', () => {
    it('should call beneficiaryProgramPivot.update with suspended status', async () => {
      mockedPrisma.beneficiaryProgramPivot.findFirst.mockResolvedValue({
        id: 'pivot-1',
        beneficiaryType: 'SENIOR_CITIZEN',
        beneficiaryId: 'sc-1',
        status: 'active',
      });
      mockedPrisma.beneficiaryProgramPivot.update.mockResolvedValue({});
      mockedPrisma.governmentProgramApplication.update.mockResolvedValue({});

      await suspendBeneficiary('app-1');

      expect(mockedPrisma.beneficiaryProgramPivot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pivot-1' },
          data: expect.objectContaining({ status: 'suspended' }),
        })
      );
    });

    it('should throw when no pivot row found', async () => {
      mockedPrisma.governmentProgramApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        resident: {
          seniorCitizenBeneficiary: { id: 'sc-1' },
          pwdBeneficiary: null,
          studentBeneficiary: null,
          soloParentBeneficiary: null,
        },
      });
      mockedPrisma.beneficiaryProgramPivot.findFirst.mockResolvedValue(null);

      await expect(suspendBeneficiary('app-1')).rejects.toThrow('No Libre-Sakay enrollment found');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // activateBeneficiary
  // ────────────────────────────────────────────────────────────────────────────

  describe('activateBeneficiary', () => {
    it('should call beneficiaryProgramPivot.update with active status', async () => {
      mockedPrisma.beneficiaryProgramPivot.findFirst.mockResolvedValue({
        id: 'pivot-1',
        beneficiaryType: 'SENIOR_CITIZEN',
        beneficiaryId: 'sc-1',
        status: 'suspended',
        suspendedAt: new Date(),
      });
      mockedPrisma.beneficiaryProgramPivot.update.mockResolvedValue({});

      await activateBeneficiary('app-1');

      expect(mockedPrisma.beneficiaryProgramPivot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pivot-1' },
          data: expect.objectContaining({ status: 'active', suspendedAt: null }),
        })
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // removeBeneficiary
  // ────────────────────────────────────────────────────────────────────────────

  describe('removeBeneficiary', () => {
    it('should call governmentProgramApplication.update with cancelled status', async () => {
      mockedPrisma.beneficiaryProgramPivot.findFirst.mockResolvedValue({
        id: 'pivot-1',
        beneficiaryType: 'SENIOR_CITIZEN',
        beneficiaryId: 'sc-1',
      });
      mockedPrisma.beneficiaryProgramPivot.update.mockResolvedValue({});
      mockedPrisma.governmentProgramApplication.update.mockResolvedValue({});

      await removeBeneficiary('app-1');

      expect(mockedPrisma.governmentProgramApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1' },
          data: expect.objectContaining({ status: 'cancelled' }),
        })
      );
    });
  });
});
