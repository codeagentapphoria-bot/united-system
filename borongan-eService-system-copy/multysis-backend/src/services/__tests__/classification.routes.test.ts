import request from 'supertest';
import express from 'express';

import classificationRoutes from '../../routes/classification.routes';

const findUniqueMock = jest.fn();
const updateMock = jest.fn();
const $queryRawMock = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    classificationType: {
      findUnique: (...args: any[]) => findUniqueMock(...args),
      update: (...args: any[]) => updateMock(...args),
    },
    $queryRaw: (...args: any[]) => $queryRawMock(...args),
  },
}));

// Mock verifyAdmin to bypass JWT validation while preserving the role check (403 for non-admin)
jest.mock('../../middleware/auth', () => ({
  __esModule: true,
  verifyAdmin: jest.fn((req: any, res: any, next: any) => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    if (req.user.type !== 'admin') {
      res.status(403).json({ status: 'error', message: 'Admin access required' });
      return;
    }
    next();
  }),
}));

// Mock the classification service to avoid Redis/cache calls
jest.mock('../../services/classification.service', () => ({
  invalidateClassificationTypesCache: jest.fn().mockResolvedValue(undefined),
}));

function buildApp(role: string = 'admin') {
  const app = express();
  app.use(express.json());
  // Inject authenticated user — verifyAdmin is mocked to skip JWT, verifyAdmin checks type
  app.use((req: any, _res, next) => {
    req.user = { id: 'user-1', role, type: role === 'admin' ? 'admin' : 'user' };
    next();
  });
  app.use('/api/classification-types', classificationRoutes);
  return app;
}

describe('PATCH /api/classification-types/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects payload missing details array', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch('/api/classification-types/123')
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects payload with unknown field type', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch('/api/classification-types/123')
      .send({ details: [{ key: 'x', label: 'X', type: 'unknown' }] });
    expect(res.status).toBe(400);
  });

  it('rejects non-admin requests', async () => {
    const app = buildApp('PORTAL_USER');
    const res = await request(app)
      .patch('/api/classification-types/123')
      .send({ details: [{ key: 'x', label: 'X', type: 'text' }] });
    expect(res.status).toBe(403);
  });

  it('accepts valid payload and updates classification_types.details', async () => {
    findUniqueMock.mockResolvedValue({ id: 123, municipalityId: 1 });
    updateMock.mockResolvedValue({
      id: 123,
      details: [{ key: 'disabilityType', label: 'Type', type: 'select', options: ['A', 'B'] }],
    });

    const app = buildApp();
    const payload = {
      details: [
        { key: 'disabilityType', label: 'Type', type: 'select', options: ['A', 'B'] },
        { key: 'remarks', label: 'Remarks', type: 'text' },
      ],
    };

    const res = await request(app)
      .patch('/api/classification-types/123')
      .send(payload);

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 123 },
      data: { details: payload.details },
    });
  });

  it('returns 404 when classification_type does not exist', async () => {
    findUniqueMock.mockResolvedValue(null);
    const app = buildApp();
    const res = await request(app)
      .patch('/api/classification-types/999')
      .send({ details: [{ key: 'x', label: 'X', type: 'text' }] });
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// GET /api/classification-types/read?name=X — public lookup by name
// =============================================================================
describe('GET /api/classification-types/read?name=X', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when name param is missing', async () => {
    // buildApp mounts all routes under /api/classification-types — /read is the new public endpoint
    const app = buildApp();
    const res = await request(app).get('/api/classification-types/read');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('name query param is required');
  });

  it('returns the classification type with details when found', async () => {
    $queryRawMock.mockResolvedValue([{
      id: 5,
      name: 'Senior Citizen',
      details: [
        { key: 'pensionTypes', label: 'Pension Type', type: 'multiselect', options: ['Regular', 'Indigent'] },
        { key: 'remarks',      label: 'Remarks',       type: 'text' },
      ],
    }]);

    const app = buildApp();
    const res = await request(app).get('/api/classification-types/read?name=Senior%20Citizen');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.name).toBe('Senior Citizen');
    expect(res.body.data.details).toHaveLength(2);
    expect(res.body.data.details[0].key).toBe('pensionTypes');
    expect(res.body.data.details[0].options).toEqual(['Regular', 'Indigent']);
  });

  it('returns 404 when classification type not found', async () => {
    $queryRawMock.mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app).get('/api/classification-types/read?name=NonExistent');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Classification type not found');
  });
});
