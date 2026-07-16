import express from 'express';
import request from 'supertest';
import serviceRoutes from '../service.routes';

jest.mock('../../middleware/auth', () => ({
  __esModule: true,
  verifyAdmin: jest.fn((_req: any, _res: any, next: any) => next()),
  verifyToken: jest.fn((_req: any, _res: any, next: any) => next()),
}));

jest.mock('../../middleware/validation', () => ({
  __esModule: true,
  validate: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

jest.mock('../../services/service-access.service', () => ({
  __esModule: true,
  requirePagePathAccess: jest.fn(() => (_req: any, res: any) =>
    res.status(403).json({ code: 'PAGE_ACCESS_DENIED' })
  ),
  requireServiceCodeAccess: jest.fn(() => (_req: any, res: any) =>
    res.status(403).json({ code: 'SERVICE_ACCESS_DENIED' })
  ),
  requireServiceIdAccess: jest.fn(() => (_req: any, res: any) =>
    res.status(403).json({ code: 'SERVICE_ACCESS_DENIED' })
  ),
}));

jest.mock('../../controllers/service.controller', () => ({
  __esModule: true,
  activateServiceController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  createServiceController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  deactivateServiceController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  deleteServiceController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  getActiveServicesController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  getAppointmentAvailabilityController: jest.fn((_req: any, res: any) =>
    res.status(200).json({ ok: true })
  ),
  getCategoriesController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  getServiceByCodeController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  getServiceController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  getServicesController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
  updateServiceController: jest.fn((_req: any, res: any) => res.status(200).json({ ok: true })),
}));

const app = express();
app.use(express.json());
app.use('/api/services', serviceRoutes);

describe('service route access guards', () => {
  it('requires service-code access for dynamic service lookup', async () => {
    const res = await request(app).get('/api/services/code/bpls');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SERVICE_ACCESS_DENIED');
  });

  it('requires the service-management page grant for service writes', async () => {
    const res = await request(app)
      .put('/api/services/11111111-1111-1111-1111-111111111111')
      .send({ name: 'Updated' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PAGE_ACCESS_DENIED');
  });
});
