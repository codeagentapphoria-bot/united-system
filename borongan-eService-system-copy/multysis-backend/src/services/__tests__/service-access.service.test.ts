import {
  canAccessServiceCode,
  canAccessServiceId,
  canAccessTransaction,
  canAccessPagePath,
  canAccessPayment,
  canAccessTaxComputation,
  canAccessExemption,
  getServiceAccessScope,
  requireServiceCodeAccess,
} from '../service-access.service';
import prisma from '../../config/database';
import { getAllowedPages } from '../user.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    service: {
      findUnique: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
    taxComputation: {
      findUnique: jest.fn(),
    },
    exemption: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../user.service', () => ({
  __esModule: true,
  getAllowedPages: jest.fn(),
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedGetAllowedPages = getAllowedPages as jest.MockedFunction<typeof getAllowedPages>;

describe('service-access.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds an all-service scope from the wildcard e-government page', async () => {
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/:serviceCode' }] as any);

    await expect(getServiceAccessScope('user-1')).resolves.toEqual({ all: true, serviceCodes: [] });
  });

  it('builds a specific service scope from exact e-government pages', async () => {
    mockedGetAllowedPages.mockResolvedValue([
      { path: '/admin/e-government/bpls' },
      { path: '/admin/e-government/birth-certificate' },
      { path: '/admin/dashboard' },
    ] as any);

    await expect(getServiceAccessScope('user-1')).resolves.toEqual({
      all: false,
      serviceCodes: ['BPLS', 'BIRTH_CERTIFICATE'],
    });
  });

  it('allows an existing service when wildcard access is granted', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 'service-1', code: 'BPLS' });
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/:serviceCode' }] as any);

    await expect(canAccessServiceCode('user-1', 'bpls')).resolves.toBe(true);
  });

  it('denies services outside exact page grants', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 'service-2', code: 'EBOSS' });
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/bpls' }] as any);

    await expect(canAccessServiceCode('user-1', 'eboss')).resolves.toBe(false);
  });

  it('denies missing services even when wildcard access exists', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(null);
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/:serviceCode' }] as any);

    await expect(canAccessServiceCode('user-1', 'missing')).resolves.toBe(false);
  });

  it('checks service access by id', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 'service-1', code: 'BPLS' });
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/bpls' }] as any);

    await expect(canAccessServiceId('user-1', 'service-1')).resolves.toBe(true);
    expect(mockedPrisma.service.findUnique).toHaveBeenCalledWith({
      where: { id: 'service-1' },
      select: { id: true, code: true },
    });
  });

  it('checks transaction access through the transaction service', async () => {
    (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 'transaction-1',
      service: { code: 'BPLS' },
    });
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/bpls' }] as any);

    await expect(canAccessTransaction('user-1', 'transaction-1')).resolves.toBe(true);
  });

  it('checks page path access through role pages', async () => {
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/:serviceCode' }] as any);

    await expect(canAccessPagePath('user-1', '/admin/e-government/bpls')).resolves.toBe(true);
  });

  it('checks payment access through its transaction service', async () => {
    (mockedPrisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      transaction: { service: { code: 'BPLS' } },
    });
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/bpls' }] as any);

    await expect(canAccessPayment('user-1', 'payment-1')).resolves.toBe(true);
  });

  it('checks tax computation access through its transaction service', async () => {
    (mockedPrisma.taxComputation.findUnique as jest.Mock).mockResolvedValue({
      id: 'computation-1',
      transaction: { service: { code: 'BPLS' } },
    });
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/bpls' }] as any);

    await expect(canAccessTaxComputation('user-1', 'computation-1')).resolves.toBe(true);
  });

  it('checks exemption access through its transaction service', async () => {
    (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue({
      id: 'exemption-1',
      transaction: { service: { code: 'BPLS' } },
    });
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/bpls' }] as any);

    await expect(canAccessExemption('user-1', 'exemption-1')).resolves.toBe(true);
  });

  it('service-code middleware denies inaccessible admin service routes', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 'service-2', code: 'EBOSS' });
    mockedGetAllowedPages.mockResolvedValue([{ path: '/admin/e-government/bpls' }] as any);
    const req = { user: { id: 'user-1', type: 'admin' }, params: { serviceCode: 'eboss' } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await requireServiceCodeAccess('serviceCode')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
