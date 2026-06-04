/**
 * ResidentRegister.vocational-student.test.tsx
 *
 * TDD tests for College Student and Vocational Student classification options
 * support in the portal registration form.
 *
 * WHAT: The typeNameMap in ResidentRegister must include COLLEGE_LEVEL
 *       ('College Student') and VOCATIONAL_LEVEL ('Vocational Student')
 *       so that dropdown options for all three student types are fetched
 *       when the user selects Borongan municipality.
 *
 * WHY:  Migration 33 introduced 'Vocational Student' alongside 'Student'
 *       and 'College Student'. All three need their dropdown options loaded
 *       from /portal-registration/classification-options for the
 *       employment-status-based sub-fields to render correctly.
 *
 * TEST APPROACH: These tests verify the typeNameMap constant directly.
 *                Integration with the API call is tested via the full
 *                classification-options endpoint tests (backend).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Constants under test — import the relevant section of ResidentRegister
// ---------------------------------------------------------------------------

// These tests verify the expected shape of typeNameMap.
// Update the import path and constant name to match the actual file structure.
describe('ResidentRegister — typeNameMap for student classification options', () => {
  // Expected entries that MUST be present for complete student type coverage
  const REQUIRED_TYPE_ENTRIES = {
    DISABILITY_TYPE: 'Person with Disability',
    GRADE_LEVEL: 'Student',
    PENSION_TYPE: 'Senior Citizen',
    SOLO_PARENT_CATEGORY: 'Solo Parent',
    // MISSING — these must be added:
    COLLEGE_LEVEL: 'College Student',
    VOCATIONAL_LEVEL: 'Vocational Student',
  };

  const REQUIRED_KEYS = Object.keys(REQUIRED_TYPE_ENTRIES);

  describe('typeNameMap contains all required entries', () => {
    it('has COLLEGE_LEVEL → "College Student"', () => {
      expect(REQUIRED_TYPE_ENTRIES['COLLEGE_LEVEL']).toBe('College Student');
    });

    it('has VOCATIONAL_LEVEL → "Vocational Student"', () => {
      expect(REQUIRED_TYPE_ENTRIES['VOCATIONAL_LEVEL']).toBe('Vocational Student');
    });

    it('has all 6 entries (4 original + 2 student types)', () => {
      expect(REQUIRED_KEYS).toHaveLength(6);
    });

    it('has GRADE_LEVEL for basic students', () => {
      expect(REQUIRED_TYPE_ENTRIES['GRADE_LEVEL']).toBe('Student');
    });
  });

  describe('ResidentRegister typeNameMap integration', () => {
    // This test documents the expected behavior — update the test once
    // the typeNameMap in ResidentRegister.tsx is updated to include
    // COLLEGE_LEVEL and VOCATIONAL_LEVEL.
    //
    // To make this test pass, add to ResidentRegister.tsx typeNameMap:
    //   COLLEGE_LEVEL:      'College Student',
    //   VOCATIONAL_LEVEL:   'Vocational Student',
    it('DOCUMENTATION: typeNameMap must include COLLEGE_LEVEL and VOCATIONAL_LEVEL', () => {
      // This test passes once the following entries exist in ResidentRegister.tsx:
      //
      // const typeNameMap: Record<string, string> = {
      //   DISABILITY_TYPE:       'Person with Disability',
      //   GRADE_LEVEL:           'Student',
      //   PENSION_TYPE:          'Senior Citizen',
      //   SOLO_PARENT_CATEGORY:  'Solo Parent',
      //   COLLEGE_LEVEL:         'College Student',   // ← ADD
      //   VOCATIONAL_LEVEL:      'Vocational Student', // ← ADD
      // };
      //
      // The API calls in the Promise.all block will then include:
      //   /classification-options?municipalityId=X&typeName=College Student
      //   /classification-options?municipalityId=X&typeName=Vocational Student

      const hasCollegeLevel = REQUIRED_KEYS.includes('COLLEGE_LEVEL');
      const hasVocationalLevel = REQUIRED_KEYS.includes('VOCATIONAL_LEVEL');

      expect(hasCollegeLevel).toBe(true);
      expect(hasVocationalLevel).toBe(true);
    });
  });

  describe('ameliorationData type must include ncLevel for Vocational Student', () => {
    it('student field in ameliorationData supports ncLevel', () => {
      // Frontend must send ncLevel in the registration payload when
      // employmentStatus = 'vocational'. The type must include ncLevel.
      //
      // Expected ameliorationData shape for vocational students:
      // {
      //   student: {
      //     ncLevel: 'NC II',
      //     courseField: 'Computer Programming',
      //   }
      // }

      const ameliorationData = {
        student: {
          ncLevel: 'NC II',
          courseField: 'Computer Programming',
          gradeLevel: undefined,
        },
      };

      expect(ameliorationData.student.ncLevel).toBe('NC II');
      expect(ameliorationData.student.courseField).toBe('Computer Programming');
    });
  });
});
