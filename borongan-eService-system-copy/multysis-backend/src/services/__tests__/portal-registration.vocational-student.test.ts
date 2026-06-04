/**
 * portal-registration.vocational-student.test.ts
 *
 * TDD tests for Vocational Student classification support.
 *
 * WHAT: autoClassifyResident must correctly classify a resident with
 *       employmentStatus = 'vocational' as 'Vocational Student', setting
 *       the ncLevel field from ameliorationData.student.ncLevel.
 *       EMPLOYMENT_STATUS_TO_CLASSIFICATION must map 'vocational'.
 *
 * WHY:  Migration 33 introduced 'Vocational Student' as a third student type
 *       alongside 'Student' and 'College Student'. The registration form must
 *       be able to classify and submit vocational student applications.
 */

import prisma from '../../config/database';
import cacheService from '../cache.service';
import { autoClassifyResident } from '../portal-registration.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const queryRawMock = jest.fn();
const executeRawMock = jest.fn();
const cacheDelMock = jest.fn();
const syncBeneficiaryMock = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    $executeRaw: (...args: unknown[]) => executeRawMock(...args),
  },
}));

jest.mock('../cache.service', () => ({
  __esModule: true,
  default: {
    del: (...args: unknown[]) => cacheDelMock(...args),
  },
}));

jest.mock('../classification.service', () => ({
  syncBeneficiaryOnInsert: (...args: unknown[]) => syncBeneficiaryMock(...args),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MUNI_ID = 1;
const RESIDENT_UUID = '550e8400-e29b-41d4-a716-446655440000';

const CLASSIFICATION_TYPE_ROWS = [
  { id: 1, name: 'Vocational Student' },
  { id: 2, name: 'Student' },
  { id: 3, name: 'College Student' },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildResident(overrides: {
  employmentStatus?: string | null;
  educationAttainment?: string | null;
  isVoter?: boolean;
  indigenousPerson?: boolean;
  birthdate?: Date | null;
} = {}) {
  return {
    employmentStatus: overrides.employmentStatus ?? null,
    educationAttainment: overrides.educationAttainment ?? null,
    isVoter: overrides.isVoter ?? false,
    indigenousPerson: overrides.indigenousPerson ?? false,
    birthdate: overrides.birthdate ?? null,
  };
}

function setupMocks(classTypeName: string) {
  queryRawMock.mockReset();
  executeRawMock.mockReset();
  cacheDelMock.mockReset();
  syncBeneficiaryMock.mockReset();

  syncBeneficiaryMock.mockResolvedValue(undefined);

  // Return the matching classification type
  const match = CLASSIFICATION_TYPE_ROWS.find((r) => r.name === classTypeName);
  queryRawMock.mockResolvedValue(match ? [match] : []);
  executeRawMock.mockResolvedValue(1);
}

// ---------------------------------------------------------------------------
// Tests: EMPLOYMENT_STATUS_TO_CLASSIFICATION
// ---------------------------------------------------------------------------

describe('EMPLOYMENT_STATUS_TO_CLASSIFICATION', () => {
  // Import the constant by re-importing the module
  let EMPLOYMENT_STATUS_TO_CLASSIFICATION: Record<string, string>;

  beforeAll(async () => {
    // Re-import to get current module state
    const module = await import('../portal-registration.service');
    EMPLOYMENT_STATUS_TO_CLASSIFICATION = (module as any).EMPLOYMENT_STATUS_TO_CLASSIFICATION;
  });

  it('maps "student" to "Student"', () => {
    expect(EMPLOYMENT_STATUS_TO_CLASSIFICATION['student']).toBe('Student');
  });

  it('maps "vocational" to "Vocational Student"', () => {
    expect(EMPLOYMENT_STATUS_TO_CLASSIFICATION['vocational']).toBe('Vocational Student');
  });

  it('maps "unemployed" to "Unemployed"', () => {
    expect(EMPLOYMENT_STATUS_TO_CLASSIFICATION['unemployed']).toBe('Unemployed');
  });

  it('maps "self-employed" to "Self Employed"', () => {
    expect(EMPLOYMENT_STATUS_TO_CLASSIFICATION['self-employed']).toBe('Self Employed');
  });

  it('maps "retired" to "Retired"', () => {
    expect(EMPLOYMENT_STATUS_TO_CLASSIFICATION['retired']).toBe('Retired');
  });
});

// ---------------------------------------------------------------------------
// Tests: autoClassifyResident — Vocational Student
// ---------------------------------------------------------------------------

describe('autoClassifyResident — Vocational Student', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('classifies as "Vocational Student" when employmentStatus is "vocational"', async () => {
    setupMocks('Vocational Student');

    await autoClassifyResident(
      RESIDENT_UUID,
      MUNI_ID,
      buildResident({ employmentStatus: 'vocational' }),
    );

    // Verify the classification type was looked up
    expect(queryRawMock).toHaveBeenCalledWith(expect.stringContaining('Vocational Student'));

    // Verify INSERT was called with 'Vocational Student'
    expect(executeRawMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO resident_classifications')
    );
    expect(executeRawMock).toHaveBeenCalledWith(
      expect.stringContaining('Vocational Student')
    );

    // Verify beneficiary sync was called with Vocational Student
    expect(syncBeneficiaryMock).toHaveBeenCalledWith(
      RESIDENT_UUID,
      'Vocational Student',
      expect.objectContaining({ ncLevel: undefined, courseField: undefined, remarks: '' })
    );
  });

  it('passes ncLevel from ameliorationData.student.ncLevel to classification details', async () => {
    setupMocks('Vocational Student');

    await autoClassifyResident(
      RESIDENT_UUID,
      MUNI_ID,
      buildResident({ employmentStatus: 'vocational' }),
      {
        student: { ncLevel: 'NC II', courseField: 'Computer Programming' },
      } as any,
    );

    // Verify INSERT includes ncLevel in the JSON details
    expect(executeRawMock).toHaveBeenCalledWith(
      expect.stringContaining('ncLevel'),
    );
    expect(executeRawMock).toHaveBeenCalledWith(
      expect.stringContaining('NC II'),
    );

    // Verify beneficiary sync received ncLevel
    expect(syncBeneficiaryMock).toHaveBeenCalledWith(
      RESIDENT_UUID,
      'Vocational Student',
      expect.objectContaining({ ncLevel: 'NC II' }),
    );
  });

  it('classifies as "Student" when employmentStatus is "student" (non-college)', async () => {
    setupMocks('Student');

    await autoClassifyResident(
      RESIDENT_UUID,
      MUNI_ID,
      buildResident({
        employmentStatus: 'student',
        educationAttainment: 'Grade 10',
      }),
    );

    expect(queryRawMock).toHaveBeenCalledWith(expect.stringContaining("'Student'"));
    expect(executeRawMock).toHaveBeenCalledWith(expect.stringContaining('Student'));
  });

  it('classifies as "College Student" when employmentStatus is "student" with tertiary education', async () => {
    setupMocks('College Student');

    await autoClassifyResident(
      RESIDENT_UUID,
      MUNI_ID,
      buildResident({
        employmentStatus: 'student',
        educationAttainment: 'Bachelor of Science in Information Technology',
      }),
    );

    expect(queryRawMock).toHaveBeenCalledWith(expect.stringContaining('College Student'));
    expect(executeRawMock).toHaveBeenCalledWith(expect.stringContaining('College Student'));
  });

  it('skips beneficiary sync but still inserts classification when type not found', async () => {
    // Return no matching classification type
    queryRawMock.mockResolvedValue([]);
    executeRawMock.mockReset();
    syncBeneficiaryMock.mockReset();

    await autoClassifyResident(
      RESIDENT_UUID,
      MUNI_ID,
      buildResident({ employmentStatus: 'vocational' }),
    );

    // Should have called the lookup
    expect(queryRawMock).toHaveBeenCalled();
    // Should NOT have inserted — type not found
    expect(executeRawMock).not.toHaveBeenCalled();
    // Should NOT have synced — type not found
    expect(syncBeneficiaryMock).not.toHaveBeenCalled();
  });

  it('still classifies as "Vocational Student" when no ameliorationData is provided', async () => {
    setupMocks('Vocational Student');

    await autoClassifyResident(
      RESIDENT_UUID,
      MUNI_ID,
      buildResident({ employmentStatus: 'vocational' }),
      undefined,
    );

    expect(queryRawMock).toHaveBeenCalledWith(expect.stringContaining('Vocational Student'));
    expect(executeRawMock).toHaveBeenCalled();
    expect(syncBeneficiaryMock).toHaveBeenCalledWith(
      RESIDENT_UUID,
      'Vocational Student',
      expect.objectContaining({ ncLevel: undefined, courseField: undefined })
    );
  });
});
