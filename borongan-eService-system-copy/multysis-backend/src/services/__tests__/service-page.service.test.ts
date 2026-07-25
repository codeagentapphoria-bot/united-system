import { createService, updateService } from '../service.service';
import prisma from '../../config/database';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    service: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    page: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../cache.service', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('service page sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an exact admin page when a service is created', async () => {
    const service = {
      id: 'service-1',
      code: 'BIRTH_CERTIFICATE',
      name: 'Birth Certificate',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.service.create as jest.Mock).mockResolvedValue(service);
    (mockedPrisma.page.upsert as jest.Mock).mockResolvedValue({ id: 'page-1' });

    await createService({ code: service.code, name: service.name });

    expect(mockedPrisma.page.upsert).toHaveBeenCalledWith({
      where: {
        system_path: { system: 'core', path: '/admin/e-government/birth-certificate' },
      },
      create: {
        system: 'core',
        path: '/admin/e-government/birth-certificate',
        name: 'Birth Certificate',
      },
      update: { name: 'Birth Certificate' },
    });
  });

  it('moves an existing exact admin page when a service code changes', async () => {
    const current = { id: 'service-1', code: 'BPLS', name: 'BPLS' };
    const updated = { ...current, code: 'EBOSS', name: 'eBOSS', updatedAt: new Date() };
    (mockedPrisma.service.findUnique as jest.Mock)
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(null);
    (mockedPrisma.service.update as jest.Mock).mockResolvedValue(updated);
    (mockedPrisma.page.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'page-1', path: '/admin/e-government/bpls' })
      .mockResolvedValueOnce(null);

    await updateService('service-1', { code: 'EBOSS', name: 'eBOSS' });

    expect(mockedPrisma.page.update).toHaveBeenCalledWith({
      where: { id: 'page-1' },
      data: { path: '/admin/e-government/eboss', name: 'eBOSS' },
    });
  });

  it('fails when a service code update would collide with another exact page', async () => {
    const current = { id: 'service-1', code: 'BPLS', name: 'BPLS' };
    const updated = { ...current, code: 'EBOSS', name: 'eBOSS', updatedAt: new Date() };
    (mockedPrisma.service.findUnique as jest.Mock)
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(null);
    (mockedPrisma.service.update as jest.Mock).mockResolvedValue(updated);
    (mockedPrisma.page.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'page-1', path: '/admin/e-government/bpls' })
      .mockResolvedValueOnce({ id: 'page-2', path: '/admin/e-government/eboss' });

    await expect(updateService('service-1', { code: 'EBOSS', name: 'eBOSS' })).rejects.toThrow(
      'A page with this system and path already exists'
    );
  });
});
