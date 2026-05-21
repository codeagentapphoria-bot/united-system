-- Migration 34: Remove gradeLevel field from College Student classification details
-- Rationale: Year level is not a required data point for college students.
-- Course / Program (courseField) is the only needed detail.

UPDATE classification_types
SET details = '[
  {
    "key": "courseField",
    "label": "Course / Program",
    "type": "text"
  },
  {
    "key": "remarks",
    "label": "Remarks",
    "type": "text"
  }
]'::jsonb
WHERE name = 'College Student';
