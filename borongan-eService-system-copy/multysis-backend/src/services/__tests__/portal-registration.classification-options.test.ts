/**
 * portal-registration.classification-options.test.ts
 *
 * TDD tests for GET /portal-registration/classification-options.
 *
 * WHAT: Public endpoint that returns classification option dropdown choices
 *       by reading from classification_types.details[].options[].
 * WHY:  Replaces the defunct /portal-registration/amelioration-settings
 *       which depended on the now-dropped social_amelioration_settings table.
 */

import request from 'supertest';
import express from 'express';

import portalRegistrationRoutes from '../../routes/portal-registration.routes';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const cacheGetMock = jest.fn();
const cacheSetMock = jest.fn();
const queryRawMock = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $queryRaw: (...args: any[]) => queryRawMock(...args),
  },
}));

jest.mock('../../services/cache.service', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => cacheGetMock(...args),
    set: (...args: any[]) => cacheSetMock(...args),
  },
}));

// ---------------------------------------------------------------------------
// Test data fixtures
// ---------------------------------------------------------------------------

const MUNI_ID = 1;

const CLASSIFICATION_TYPES: Record<string, unknown[]> = {
  'Person with Disability': [
    {
      id: 10,
      municipality_id: MUNI_ID,
      name: 'Person with Disability',
      details: [
        { key: 'disabilityType', label: 'Disability Type', type: 'select', options: ['Visual Impairment', 'Physical Disability', 'Hearing Impairment'] },
        { key: 'disabilityLevel', label: 'Level', type: 'select', options: ['Mild', 'Moderate', 'Severe'] },
        { key: 'remarks', label: 'Remarks', type: 'text' },
      ],
      is_active: true,
    },
  ],
  Student: [
    {
      id: 11,
      municipality_id: MUNI_ID,
      name: 'Student',
      details: [
        { key: 'gradeLevel', label: 'Grade Level', type: 'select', options: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] },
        { key: 'remarks', label: 'Remarks', type: 'text' },
      ],
      is_active: true,
    },
  ],
  'Senior Citizen': [
    {
      id: 12,
      municipality_id: MUNI_ID,
      name: 'Senior Citizen',
      details: [
        { key: 'pensionTypes', label: 'Pension Types', type: 'multiselect', options: ['Social Pension', 'DSWD', 'SCP', 'None'] },
        { key: 'remarks', label: 'Remarks', type: 'text' },
      ],
      is_active: true,
    },
  ],
  'Solo Parent': [
    {
      id: 13,
      municipality_id: MUNI_ID,
      name: 'Solo Parent',
      details: [
        { key: 'category', label: 'Category', type: 'select', options: ['Category A', 'Category B'] },
        { key: 'remarks', label: 'Remarks', type: 'text' },
      ],
      is_active: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/portal-registration', portalRegistrationRoutes);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/portal-registration/classification-options', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: cache miss → query DB
    cacheGetMock.mockResolvedValue(null);
    cacheSetMock.mockResolvedValue(true);
  });

  // -------------------------------------------------------------------------
  // Happy path — select type
  // -------------------------------------------------------------------------

  describe('DISABILITY_TYPE — select field', () => {
    it('returns options array as { id, name } for a select field', async () => {
      queryRawMock.mockResolvedValue(CLASSIFICATION_TYPES['Person with Disability']);

      const app = buildApp();
      const res = await request(app)
        .get('/api/portal-registration/classification-options')
        .query({ municipalityId: MUNI_ID, typeName: 'Person with Disability' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toEqual([
        { id: 'Visual Impairment', name: 'Visual Impairment' },
        { id: 'Physical Disability', name: 'Physical Disability' },
        { id: 'Hearing Impairment', name: 'Hearing Impairment' },
      ]);
    });

    it('uses cached result on second request', async () => {
      const cached = [
        { id: 'Visual Impairment', name: 'Visual Impairment' },
        { id: 'Physical Disability', name: 'Physical Disability' },
      ];
      cacheGetMock.mockResolvedValue(cached);
      queryRawMock.mockResolvedValue(CLASSIFICATION_TYPES['Person with Disability']); // should NOT be called

      const app = buildApp();
      const res = await request(app)
        .get('/api/portal-registration/classification-options')
        .query({ municipalityId: MUNI_ID, typeName: 'Person with Disability' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(cached);
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it('caches result after DB query', async () => {
      queryRawMock.mockResolvedValue(CLASSIFICATION_TYPES['Person with Disability']);

      const app = buildApp();
      await request(app)
        .get('/api/portal-registration/classification-options')
        .query({ municipalityId: MUNI_ID, typeName: 'Person with Disability' });

      expect(cacheSetMock).toHaveBeenCalledWith(
        `portal:classifications:${MUNI_ID}:Person with Disability`,
        expect.any(Array),
        expect.any(Number)
      );
    });
  });

  describe('GRADE_LEVEL — select field', () => {
    it('returns options for Student classification type', async () => {
      queryRawMock.mockResolvedValue(CLASSIFICATION_TYPES['Student']);

      const app = buildApp();
      const res = await request(app)
        .get('/api/portal-registration/classification-options')
        .query({ municipalityId: MUNI_ID, typeName: 'Student' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { id: 'Grade 1', name: 'Grade 1' },
        { id: 'Grade 2', name: 'Grade 2' },
        { id: 'Grade 3', name: 'Grade 3' },
        { id: 'Grade 4', name: 'Grade 4' },
        { id: 'Grade 5', name: 'Grade 5' },
        { id: 'Grade 6', name: 'Grade 6' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Happy path — multiselect type
  // -------------------------------------------------------------------------

  describe('PENSION_TYPE — multiselect field', () => {
    it('returns options for Senior Citizen classification (multiselect)', async () => {
      queryRawMock.mockResolvedValue(CLASSIFICATION_TYPES['Senior Citizen']);

      const app = buildApp();
      const res = await request(app)
        .get('/api/portal-registration/classification-options')
        .query({ municipalityId: MUNI_ID, typeName: 'Senior Citizen' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { id: 'Social Pension', name: 'Social Pension' },
        { id: 'DSWD', name: 'DSWD' },
        { id: 'SCP', name: 'SCP' },
        { id: 'None', name: 'None' },
      ]);
    });
  });

  describe('SOLO_PARENT_CATEGORY — select field', () => {
    it('returns options for Solo Parent classification', async () => {
      queryRawMock.mockResolvedValue(CLASSIFICATION_TYPES['Solo Parent']);

      const app = buildApp();
      const res = await request(app)
        .get('/api/portal-registration/classification-options')
        .query({ municipalityId: MUNI_ID, typeName: 'Solo Parent' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { id: 'Category A', name: 'Category A' },
        { id: 'Category B', name: 'Category B' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('returns empty array when classification type has no options for the target field', async () => {
    queryRawMock.mockResolvedValue([{
      id: 99,
      municipality_id: MUNI_ID,
      name: 'Empty Type',
      details: [
        { key: 'remarks', label: 'Remarks', type: 'text' },
      ],
      is_active: true,
    }]);

    const app = buildApp();
    const res = await request(app)
      .get('/api/portal-registration/classification-options')
      .query({ municipalityId: MUNI_ID, typeName: 'Empty Type' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 404 when no classification type matches municipalityId + typeName', async () => {
    queryRawMock.mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app)
      .get('/api/portal-registration/classification-options')
      .query({ municipalityId: 999, typeName: 'Non Existent' });

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toContain('not found');
  });

  it('returns 400 when municipalityId is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/portal-registration/classification-options')
      .query({ typeName: 'Person with Disability' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when typeName is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/portal-registration/classification-options')
      .query({ municipalityId: MUNI_ID });

    expect(res.status).toBe(400);
  });

  it('returns empty array when details[] is empty', async () => {
    queryRawMock.mockResolvedValue([{
      id: 99,
      municipality_id: MUNI_ID,
      name: 'Empty',
      details: [],
      is_active: true,
    }]);

    const app = buildApp();
    const res = await request(app)
      .get('/api/portal-registration/classification-options')
      .query({ municipalityId: MUNI_ID, typeName: 'Empty' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns empty array when details[] has no matching key field', async () => {
    queryRawMock.mockResolvedValue([{
      id: 99,
      municipality_id: MUNI_ID,
      name: 'Person with Disability',
      details: [
        { key: 'someOtherField', label: 'Other', type: 'select', options: ['A'] },
      ],
      is_active: true,
    }]);

    const app = buildApp();
    const res = await request(app)
      .get('/api/portal-registration/classification-options')
      .query({ municipalityId: MUNI_ID, typeName: 'Person with Disability' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('is publicly accessible — no auth middleware triggered', async () => {
    queryRawMock.mockResolvedValue(CLASSIFICATION_TYPES['Person with Disability']);

    const app = buildApp();
    // No auth cookie/header
    const res = await request(app)
      .get('/api/portal-registration/classification-options')
      .query({ municipalityId: MUNI_ID, typeName: 'Person with Disability' });

    expect(res.status).toBe(200);
  });
});
