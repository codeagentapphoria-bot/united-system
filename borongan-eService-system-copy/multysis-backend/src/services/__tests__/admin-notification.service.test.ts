import { getAdminNotificationCounts } from '../admin.service';
import prisma from '../../config/database';
import cacheService from '../cache.service';
import { getServiceAccessScope } from '../service-access.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    service: {
      findMany: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
    transactionNote: {
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../cache.service', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../service-access.service', () => ({
  __esModule: true,
  getServiceAccessScope: jest.fn(),
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedCache = cacheService as jest.Mocked<typeof cacheService>;
const mockedGetServiceAccessScope = getServiceAccessScope as jest.MockedFunction<
  typeof getServiceAccessScope
>;

describe('admin notification counts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters service notification counts for scoped admins without using the global cache', async () => {
    mockedGetServiceAccessScope.mockResolvedValue({ all: false, serviceCodes: ['BPLS'] });
    (mockedPrisma.service.findMany as jest.Mock).mockResolvedValue([
      { id: 'service-1', code: 'BPLS', paymentStatuses: ['PENDING'] },
    ]);
    (mockedPrisma.transaction.count as jest.Mock)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    (mockedPrisma.transactionNote.count as jest.Mock).mockResolvedValue(3);

    const counts = await getAdminNotificationCounts('admin-1');

    expect(mockedCache.get).not.toHaveBeenCalledWith('admin:notificationCounts');
    expect(mockedPrisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, code: { in: ['BPLS'] } } })
    );
    expect(mockedPrisma.transaction.count).toHaveBeenCalledWith({
      where: { serviceId: 'service-1', paymentStatus: 'PENDING' },
    });
    expect(mockedPrisma.transaction.count).toHaveBeenCalledWith({
      where: {
        updateRequestStatus: 'PENDING_ADMIN',
        service: { code: { in: ['BPLS'] } },
      },
    });
    expect(mockedPrisma.transactionNote.count).toHaveBeenCalledWith({
      where: {
        isRead: false,
        senderType: 'RESIDENT',
        transaction: { service: { code: { in: ['BPLS'] } } },
      },
    });
    expect(counts).toMatchObject({
      pendingApplications: 2,
      pendingUpdateRequests: 1,
      unreadMessages: 3,
      pendingCitizens: 0,
      pendingProgramApplications: 0,
      total: 6,
      pendingApplicationsByService: { BPLS: 2 },
    });
  });
});
