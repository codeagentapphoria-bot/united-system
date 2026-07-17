import prisma from '../../config/database';
import { createTransaction, updateTransaction } from '../transaction.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    resident: { findUnique: jest.fn() },
    service: { findUnique: jest.fn() },
    certificateTemplate: { findFirst: jest.fn() },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../tax-computation.service', () => ({
  __esModule: true,
  computeTaxForTransaction: jest.fn(),
}));

jest.mock('../dev.service', () => ({
  __esModule: true,
  addDevLog: jest.fn(),
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

const barangayService = {
  id: 'service-1',
  code: 'BRGY_CERTIFICATE',
  category: 'Barangay Certificate',
  isActive: true,
  defaultAmount: 0,
  paymentStatuses: ['PENDING'],
  requiresAppointment: false,
};

describe('barangay certificate transaction guards', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects unauthenticated barangay certificate submissions', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(barangayService);

    await expect(
      createTransaction({
        applicantName: 'Guest User',
        serviceId: 'service-1',
        serviceData: { certificate_type: 'barangay_clearance', purpose: 'Employment' },
      })
    ).rejects.toThrow('Barangay certificates require an authenticated resident');
  });

  it('rejects resident mismatch for barangay certificates', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(barangayService);
    (mockedPrisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: 'resident-1',
      barangayId: 10,
      barangay: { municipalityId: 7 },
    });

    await expect(
      createTransaction(
        {
          residentId: 'resident-1',
          serviceId: 'service-1',
          serviceData: { certificate_type: 'barangay_clearance', purpose: 'Employment' },
        },
        { id: 'resident-2', type: 'resident' }
      )
    ).rejects.toThrow('Residents can only request barangay certificates for themselves');
  });

  it('rejects inactive or missing resident municipality templates', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(barangayService);
    (mockedPrisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: 'resident-1',
      barangayId: 10,
      barangay: { municipalityId: 7 },
    });
    (mockedPrisma.certificateTemplate.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      createTransaction(
        {
          residentId: 'resident-1',
          serviceId: 'service-1',
          serviceData: { certificate_type: 'barangay_clearance', purpose: 'Employment' },
        },
        { id: 'resident-1', type: 'resident' }
      )
    ).rejects.toThrow('Selected certificate template is not available');
  });

  it('rejects generic eService admin updates for barangay certificate transactions', async () => {
    (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      service: barangayService,
      resident: null,
    });

    await expect(updateTransaction('tx-1', { status: 'APPROVED' }, { type: 'admin' })).rejects.toThrow(
      'Barangay certificate transactions are processed in BIMS'
    );
  });
});
