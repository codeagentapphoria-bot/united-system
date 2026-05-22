/**
 * StudentsTab.info-card.test.tsx
 *
 * TDD tests for StudentsTab Info card education-level-aware display.
 *
 * WHAT: The Info card must display correct label/value pairs based on
 *        education level (vocational / college / basic student).
 *
 * TEST APPROACH:
 *  - Pure unit tests for isCollege, isVocational, getEducationFields
 *  - No React testing-library needed — helpers are pure functions
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers — mirror of logic that will be added to StudentsTab.tsx
// ---------------------------------------------------------------------------

const isCollege = (educationAttainment: string): boolean => {
  const v = (educationAttainment || '').toLowerCase();
  return (
    v.includes('college') ||
    v.includes('bachelor') ||
    v.includes('graduate') ||
    v.includes('master') ||
    v.includes('doctorate') ||
    v.includes('university')
  );
};

const isVocational = (educationAttainment: string): boolean => {
  const v = (educationAttainment || '').toLowerCase();
  return v.includes('vocational') || v.includes('technical') || v.includes('tesda');
};

interface EducationField {
  label: string;
  value: string;
}

const getEducationFields = (beneficiary: any): EducationField[] => {
  const citizen = beneficiary?.citizen || beneficiary || {};
  const details = beneficiary?.classification_details || {};

  const educationAttainment =
    citizen.educationAttainment ||
    citizen.education ||
    beneficiary.educationAttainment ||
    '';
  const classificationType =
    beneficiary.classification_type ||
    beneficiary.classificationType ||
    '';

  const levelHint = isVocational(educationAttainment)
    ? 'vocational'
    : isCollege(educationAttainment)
    ? 'college'
    : classificationType === 'College Student' || classificationType === 'CollegeStudent'
    ? 'college'
    : classificationType === 'Vocational Student' || classificationType === 'VocationalStudent'
    ? 'vocational'
    : 'basic';

  if (levelHint === 'vocational') {
    const ncLevel = details.ncLevel || beneficiary.ncLevel || '';
    const courseField = details.courseField || beneficiary.courseField || '';
    const fields: EducationField[] = [];
    if (ncLevel) fields.push({ label: 'NC Level / Qualification', value: ncLevel });
    if (courseField) fields.push({ label: 'Course / Program', value: courseField });
    return fields;
  }

  if (levelHint === 'college') {
    const courseField = details.courseField || beneficiary.courseField || '';
    if (courseField) return [{ label: 'Course / Program', value: courseField }];
    return [];
  }

  const gradeLevel =
    details.gradeLevel ||
    beneficiary.gradeLevel ||
    beneficiary.gradeLevelName ||
    '';
  if (gradeLevel) return [{ label: 'Grade Level', value: gradeLevel }];
  return [];
};

// ---------------------------------------------------------------------------
// isCollege
// ---------------------------------------------------------------------------
describe('isCollege', () => {
  it('returns true for College Graduate', () => expect(isCollege('College Graduate')).toBe(true));
  it('returns true for Bachelor of Science', () => expect(isCollege('Bachelor of Science')).toBe(true));
  it('returns true for Master of Business Administration', () => expect(isCollege('Master of Business Administration')).toBe(true));
  it('returns true for Doctor of Philosophy', () => expect(isCollege('Doctor of Philosophy')).toBe(true));
  it('returns true for Graduate Degree', () => expect(isCollege('Graduate Degree')).toBe(true));
  it('returns true for University Level', () => expect(isCollege('University Level')).toBe(true));
  it('returns false for Elementary', () => expect(isCollege('Elementary')).toBe(false));
  it('returns false for Junior High School', () => expect(isCollege('Junior High School')).toBe(false));
  it('returns false for Senior High School', () => expect(isCollege('Senior High School')).toBe(false));
  it('returns false for empty string', () => expect(isCollege('')).toBe(false));
  it('returns false for null/undefined', () => {
    expect(isCollege(null as any)).toBe(false);
    expect(isCollege(undefined as any)).toBe(false);
  });
  it('is case-insensitive', () => {
    expect(isCollege('COLLEGE GRADUATE')).toBe(true);
    expect(isCollege('Bachelor')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isVocational
// ---------------------------------------------------------------------------
describe('isVocational', () => {
  it('returns true for Vocational Graduate', () => expect(isVocational('Vocational Graduate')).toBe(true));
  it('returns true for Technical Graduate', () => expect(isVocational('Technical Graduate')).toBe(true));
  it('returns true for TESDA Certified', () => expect(isVocational('TESDA Certified')).toBe(true));
  it('returns false for College Graduate', () => expect(isVocational('College Graduate')).toBe(false));
  it('returns false for Senior High School', () => expect(isVocational('Senior High School')).toBe(false));
  it('returns false for empty string', () => expect(isVocational('')).toBe(false));
  it('returns false for null/undefined', () => {
    expect(isVocational(null as any)).toBe(false);
    expect(isVocational(undefined as any)).toBe(false);
  });
  it('is case-insensitive', () => {
    expect(isVocational('VOCATIONAL GRADUATE')).toBe(true);
    expect(isVocational('Technical')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getEducationFields — basic Student
// ---------------------------------------------------------------------------
describe('getEducationFields — basic Student', () => {
  it('returns Grade Level from classification_details.gradeLevel', () => {
    expect(getEducationFields({ classification_details: { gradeLevel: 'Grade 7' } }))
      .toEqual([{ label: 'Grade Level', value: 'Grade 7' }]);
  });

  it('returns Grade Level from flat gradeLevel field', () => {
    expect(getEducationFields({ gradeLevel: 'Grade 10' }))
      .toEqual([{ label: 'Grade Level', value: 'Grade 10' }]);
  });

  it('returns Grade Level from flat gradeLevelName field', () => {
    expect(getEducationFields({ gradeLevelName: 'Senior High School (Grade 11–12)' }))
      .toEqual([{ label: 'Grade Level', value: 'Senior High School (Grade 11–12)' }]);
  });

  it('prioritises classification_details.gradeLevel over flat fields', () => {
    expect(getEducationFields({
      classification_details: { gradeLevel: 'Grade 5' },
      gradeLevel: 'Grade 8',
      gradeLevelName: 'Grade 9',
    })).toEqual([{ label: 'Grade Level', value: 'Grade 5' }]);
  });

  it('returns Grade Level via classification_type Student', () => {
    expect(getEducationFields({
      classification_type: 'Student',
      classification_details: {},
      gradeLevel: 'Grade 3',
    })).toEqual([{ label: 'Grade Level', value: 'Grade 3' }]);
  });

  it('returns empty array when no grade level data is present', () => {
    expect(getEducationFields({ classification_type: 'Student', classification_details: {} }))
      .toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getEducationFields — College Student
// ---------------------------------------------------------------------------
describe('getEducationFields — College Student', () => {
  it('returns Course / Program from classification_details.courseField', () => {
    expect(getEducationFields({
      classification_type: 'College Student',
      classification_details: { courseField: 'BS Computer Engineering' },
    })).toEqual([{ label: 'Course / Program', value: 'BS Computer Engineering' }]);
  });

  it('returns Course / Program from flat courseField', () => {
    expect(getEducationFields({
      classification_type: 'College Student',
      classification_details: {},
      courseField: 'BS Nursing',
    })).toEqual([{ label: 'Course / Program', value: 'BS Nursing' }]);
  });

  it('detects college via educationAttainment containing college', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'College Graduate' },
      classification_details: { courseField: 'BS Accountancy' },
    })).toEqual([{ label: 'Course / Program', value: 'BS Accountancy' }]);
  });

  it('detects college via educationAttainment containing bachelor', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'Bachelor of Arts' },
      classification_details: { courseField: 'AB Philosophy' },
    })).toEqual([{ label: 'Course / Program', value: 'AB Philosophy' }]);
  });

  it('detects college via educationAttainment containing master', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'Master of Business Administration' },
      classification_details: { courseField: 'MBA' },
    })).toEqual([{ label: 'Course / Program', value: 'MBA' }]);
  });

  it('detects college via educationAttainment containing university', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'University Level' },
      classification_details: { courseField: 'BS Biology' },
    })).toEqual([{ label: 'Course / Program', value: 'BS Biology' }]);
  });

  it('returns empty array when no courseField data is present', () => {
    expect(getEducationFields({
      classification_type: 'College Student',
      classification_details: {},
      courseField: '',
    })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getEducationFields — Vocational Student
// ---------------------------------------------------------------------------
describe('getEducationFields — Vocational Student', () => {
  it('returns NC Level and Course from classification_details', () => {
    expect(getEducationFields({
      classification_type: 'Vocational Student',
      classification_details: { ncLevel: 'NC II', courseField: 'Computer Programming' },
    })).toEqual([
      { label: 'NC Level / Qualification', value: 'NC II' },
      { label: 'Course / Program', value: 'Computer Programming' },
    ]);
  });

  it('returns NC Level only when courseField is empty', () => {
    expect(getEducationFields({
      classification_type: 'Vocational Student',
      classification_details: { ncLevel: 'NC III', courseField: '' },
    })).toEqual([{ label: 'NC Level / Qualification', value: 'NC III' }]);
  });

  it('returns Course only when ncLevel is empty', () => {
    expect(getEducationFields({
      classification_type: 'Vocational Student',
      classification_details: { ncLevel: '', courseField: 'Automotive Servicing' },
    })).toEqual([{ label: 'Course / Program', value: 'Automotive Servicing' }]);
  });

  it('detects vocational via educationAttainment containing vocational', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'Vocational Graduate' },
      classification_details: { ncLevel: 'NC I', courseField: 'Cookery' },
    })).toEqual([
      { label: 'NC Level / Qualification', value: 'NC I' },
      { label: 'Course / Program', value: 'Cookery' },
    ]);
  });

  it('detects vocational via educationAttainment containing technical', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'Technical Graduate' },
      classification_details: { ncLevel: 'NC IV', courseField: 'Electronics' },
    })).toEqual([
      { label: 'NC Level / Qualification', value: 'NC IV' },
      { label: 'Course / Program', value: 'Electronics' },
    ]);
  });

  it('detects vocational via educationAttainment containing tesda', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'TESDA Certified' },
      classification_details: { ncLevel: 'NC V', courseField: 'Shielded Metal Arc Welding' },
    })).toEqual([
      { label: 'NC Level / Qualification', value: 'NC V' },
      { label: 'Course / Program', value: 'Shielded Metal Arc Welding' },
    ]);
  });

  it('falls back to flat ncLevel / courseField when classification_details absent', () => {
    expect(getEducationFields({
      classification_type: 'Vocational Student',
      classification_details: {},
      ncLevel: 'NC VI',
      courseField: 'Food Processing',
    })).toEqual([
      { label: 'NC Level / Qualification', value: 'NC VI' },
      { label: 'Course / Program', value: 'Food Processing' },
    ]);
  });

  it('returns empty array when both ncLevel and courseField are absent', () => {
    expect(getEducationFields({
      classification_type: 'Vocational Student',
      classification_details: {},
    })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getEducationFields — priority / precedence
// ---------------------------------------------------------------------------
describe('getEducationFields — priority / precedence', () => {
  it('educationAttainment takes priority over classification_type for college', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'College Graduate' },
      classification_type: 'Student',
      classification_details: { courseField: 'BS Mathematics' },
    })).toEqual([{ label: 'Course / Program', value: 'BS Mathematics' }]);
  });

  it('educationAttainment takes priority over classification_type for vocational', () => {
    expect(getEducationFields({
      citizen: { educationAttainment: 'Technical Graduate' },
      classification_type: 'Student',
      classification_details: { ncLevel: 'NC II', courseField: 'HVAC' },
    })).toEqual([
      { label: 'NC Level / Qualification', value: 'NC II' },
      { label: 'Course / Program', value: 'HVAC' },
    ]);
  });

  it('handles beneficiary with nested citizen object', () => {
    expect(getEducationFields({
      citizen: { id: '123', firstName: 'Juan', educationAttainment: 'Master of Science' },
      classification_details: { courseField: 'MS Data Science' },
    })).toEqual([{ label: 'Course / Program', value: 'MS Data Science' }]);
  });

  it('handles flat citizen.education (not educationAttainment)', () => {
    expect(getEducationFields({
      citizen: { education: 'College Level' },
      classification_details: { courseField: 'BS Physics' },
    })).toEqual([{ label: 'Course / Program', value: 'BS Physics' }]);
  });
});
