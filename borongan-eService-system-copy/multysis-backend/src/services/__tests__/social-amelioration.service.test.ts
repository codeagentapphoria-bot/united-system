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
});
