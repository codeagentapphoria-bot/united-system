/**
 * AddStudentFields.test.tsx
 *
 * TDD tests for AddStudentFields education-level detection.
 *
 * WHAT: The component must detect educationAttainment from selectedCitizen
 *       and render the correct fields per classification:
 *         - K-12 (neither college nor vocational) → Student → gradeLevel dropdown
 *         - College → College Student → courseField text input
 *         - Vocational/TESDA → Vocational Student → ncLevel dropdown + courseField text input
 *
 * WHY:  The component currently only shows a gradeLevel dropdown for all students.
 *       Migration 33 introduced 'College Student' and 'Vocational Student' types
 *       with their own schemas. The component must branch based on educationAttainment.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AddStudentFields } from '../AddStudentFields';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal StudentInput shape for testing */
type StudentInput = z.infer<typeof import('@/validations/beneficiary.schema').studentSchema>;

function TestWrapper({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: Partial<StudentInput>;
}) {
  const methods = useForm<StudentInput>({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

// ---------------------------------------------------------------------------
// Mock hooks
// ---------------------------------------------------------------------------

const GRADE_LEVEL_OPTIONS = [
  'Elementary (Grade 1–6)',
  'Junior High School (Grade 7–10)',
  'Senior High School (Grade 11–12)',
];

const NC_LEVEL_OPTIONS = [
  'NC I',
  'NC II',
  'NC III',
  'NC IV',
  'NC V',
  'NC VI',
  'Diploma',
  'Bachelor',
  'Master',
  'Doctorate',
];

const STUDENT_TYPE_RESPONSE = {
  id: 1,
  name: 'Student',
  details: [
    {
      key: 'gradeLevel',
      label: 'Grade Level',
      type: 'select' as const,
      options: GRADE_LEVEL_OPTIONS,
    },
  ],
};

const COLLEGE_TYPE_RESPONSE = {
  id: 2,
  name: 'College Student',
  details: [],
};

const VOCATIONAL_TYPE_RESPONSE = {
  id: 3,
  name: 'Vocational Student',
  details: [
    {
      key: 'ncLevel',
      label: 'NC Level',
      type: 'select' as const,
      options: NC_LEVEL_OPTIONS,
    },
    {
      key: 'courseField',
      label: 'Course / Program',
      type: 'text' as const,
    },
  ],
};

const makeMockHook = (response: any, loading = false) => () => ({
  data: response,
  loading,
  error: null,
  refetch: jest.fn(),
  patchDetails: jest.fn(),
});

jest.mock('@/hooks/useClassificationOptions', () => ({
  useClassificationOptions: jest.fn(),
}));

const mockUseClassificationOptions = require('@/hooks/useClassificationOptions').useClassificationOptions;

function setupMocks(opts: {
  studentLoading?: boolean;
  collegeLoading?: boolean;
  vocationalLoading?: boolean;
}) {
  mockUseClassificationOptions
    .mockReturnValueOnce({
      data: STUDENT_TYPE_RESPONSE,
      loading: opts.studentLoading ?? false,
      error: null,
      refetch: jest.fn(),
      patchDetails: jest.fn(),
    })
    .mockReturnValueOnce({
      data: COLLEGE_TYPE_RESPONSE,
      loading: opts.collegeLoading ?? false,
      error: null,
      refetch: jest.fn(),
      patchDetails: jest.fn(),
    })
    .mockReturnValueOnce({
      data: VOCATIONAL_TYPE_RESPONSE,
      loading: opts.vocationalLoading ?? false,
      error: null,
      refetch: jest.fn(),
      patchDetails: jest.fn(),
    });
}

// ---------------------------------------------------------------------------
// Shared props factory
// ---------------------------------------------------------------------------

function defaultProps() {
  return {
    onAddNewCitizen: jest.fn(),
    isLoadingCitizens: false,
    localSearchQuery: '',
    onSearchChange: jest.fn(),
    selectedCitizen: null,
    onCitizenSelect: jest.fn(),
    filteredCitizens: [],
  };
}

function renderWithProps(props = defaultProps()) {
  render(
    <TestWrapper>
      <AddStudentFields {...props} />
    </TestWrapper>
  );
}

// ---------------------------------------------------------------------------
// Education-level detection helpers
// ---------------------------------------------------------------------------

const collegeAttainments = [
  'College Undergraduate',
  "Bachelor's Degree",
  'Graduate',
  "Master's Degree",
  'Doctorate',
  'University Level',
];

const vocationalAttainments = [
  'Vocational',
  'Technical',
  'TESDA',
  'Vocational Graduate',
];

const k12Attainments = ['Elementary', 'High School', 'Senior High School'];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddStudentFields — education-level detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // K-12 students (neither college nor vocational)
  // -------------------------------------------------------------------------
  describe('K-12 student (no educationAttainment or basic level)', () => {
    it.each(k12Attainments)(
      'renders gradeLevel dropdown when educationAttainment = "%s"',
      (attainment) => {
        setupMocks({});
        const props = defaultProps();
        props.selectedCitizen = {
          id: 'cit-1',
          fullName: 'Juan Dela Cruz',
          educationAttainment: attainment,
        };

        renderWithProps(props);

        // Section heading
        expect(screen.getByText('Student Information')).toBeInTheDocument();

        // gradeLevel dropdown must be visible
        expect(screen.getByText('Grade Level')).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /grade level/i })).toBeInTheDocument();

        // Options present
        const gradeSelect = screen.getByRole('combobox', { name: /grade level/i });
        userEvent.click(gradeSelect);
        GRADE_LEVEL_OPTIONS.forEach((opt) => {
          expect(screen.getByRole('option', { name: opt })).toBeInTheDocument();
        });
      }
    );

    it('renders gradeLevel when no educationAttainment is set (defaults to K-12)', () => {
      setupMocks({});
      const props = defaultProps();
      props.selectedCitizen = { id: 'cit-2', fullName: 'No Education' };

      renderWithProps(props);

      expect(screen.getByText('Grade Level')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /grade level/i })).toBeInTheDocument();
    });

    it('does NOT render courseField for K-12 students', () => {
      setupMocks({});
      const props = defaultProps();
      props.selectedCitizen = {
        id: 'cit-3',
        fullName: 'Jane Doe',
        educationAttainment: 'Elementary',
      };

      renderWithProps(props);

      expect(screen.queryByText('Course / Program')).not.toBeInTheDocument();
    });

    it('does NOT render ncLevel dropdown for K-12 students', () => {
      setupMocks({});
      const props = defaultProps();
      props.selectedCitizen = {
        id: 'cit-4',
        fullName: 'Jane Doe',
        educationAttainment: 'High School',
      };

      renderWithProps(props);

      expect(screen.queryByRole('combobox', { name: /nc level/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // College students
  // -------------------------------------------------------------------------
  describe.each(collegeAttainments)('College student — educationAttainment = "%s"', (attainment) => {
    it('renders courseField text input (not gradeLevel)', () => {
      setupMocks({});
      const props = defaultProps();
      props.selectedCitizen = {
        id: 'col-1',
        fullName: 'College Student',
        educationAttainment: attainment,
      };

      renderWithProps(props);

      // Section heading
      expect(screen.getByText('Student Information')).toBeInTheDocument();

      // courseField is visible
      expect(screen.getByText('Course / Program')).toBeInTheDocument();
      const courseInput = screen.getByPlaceholderText('e.g., BS Computer Engineering');
      expect(courseInput).toBeInTheDocument();

      // gradeLevel dropdown is NOT shown
      expect(screen.queryByRole('combobox', { name: /grade level/i })).not.toBeInTheDocument();
    });

    it('does NOT render ncLevel dropdown for college students', () => {
      setupMocks({});
      const props = defaultProps();
      props.selectedCitizen = {
        id: 'col-2',
        fullName: 'College Student',
        educationAttainment: attainment,
      };

      renderWithProps(props);

      expect(screen.queryByRole('combobox', { name: /nc level/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Vocational / TESDA students
  // -------------------------------------------------------------------------
  describe.each(vocationalAttainments)('Vocational student — educationAttainment = "%s"', (attainment) => {
    it('renders ncLevel dropdown', () => {
      setupMocks({});
      const props = defaultProps();
      props.selectedCitizen = {
        id: 'voc-1',
        fullName: 'Voc Student',
        educationAttainment: attainment,
      };

      renderWithProps(props);

      // Section heading
      expect(screen.getByText('Student Information')).toBeInTheDocument();

      // ncLevel dropdown visible
      expect(screen.getByText('NC Level / Qualification')).toBeInTheDocument();
      const ncSelect = screen.getByRole('combobox', { name: /nc level/i });
      expect(ncSelect).toBeInTheDocument();

      // Options present
      userEvent.click(ncSelect);
      NC_LEVEL_OPTIONS.forEach((opt) => {
        expect(screen.getByRole('option', { name: opt })).toBeInTheDocument();
      });
    });

    it('renders courseField text input', () => {
      setupMocks({});
      const props = defaultProps();
      props.selectedCitizen = {
        id: 'voc-2',
        fullName: 'Voc Student',
        educationAttainment: attainment,
      };

      renderWithProps(props);

      expect(screen.getByText('Course / Program')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., BS Computer Engineering')).toBeInTheDocument();
    });

    it('does NOT render gradeLevel dropdown for vocational students', () => {
      setupMocks({});
      const props = defaultProps();
      props.selectedCitizen = {
        id: 'voc-3',
        fullName: 'Voc Student',
        educationAttainment: attainment,
      };

      renderWithProps(props);

      expect(screen.queryByRole('combobox', { name: /grade level/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('Loading state', () => {
    it('shows "Loading..." when classification options are loading', () => {
      setupMocks({ studentLoading: true, collegeLoading: true, vocationalLoading: true });
      const props = defaultProps();
      props.selectedCitizen = { id: 'load-1', fullName: 'Loading Test', educationAttainment: 'Elementary' };

      renderWithProps(props);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
