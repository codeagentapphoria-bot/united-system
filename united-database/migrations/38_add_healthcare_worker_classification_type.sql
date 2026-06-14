-- Migration: 38_add_healthcare_worker_classification_type
-- Adds Healthcare Worker classification type to classification_types for all municipalities
-- Date: 2026-06-12

-- =============================================================================
-- 1. Insert Healthcare Worker classification type for all municipalities
-- =============================================================================

INSERT INTO classification_types (municipality_id, name, description, color, details, is_active, created_at, updated_at)
SELECT
  m.id,
  'Healthcare Worker'::text,
  'Individuals working in healthcare facilities such as hospitals, clinics, and rural health units'::text,
  '#14B8A6'::text,
  (
    SELECT jsonb_build_array(
      jsonb_build_object(
        'key',   'occupation',
        'label', 'Occupation',
        'type',  'text'
      ),
      jsonb_build_object(
        'key',   'workplace',
        'label', 'Workplace / Facility',
        'type',  'text'
      ),
      jsonb_build_object(
        'key',   'remarks',
        'label', 'Remarks',
        'type',  'text'
      )
    )
  )::jsonb,
  true,
  NOW(),
  NOW()
FROM municipalities m
ON CONFLICT (municipality_id, name)
DO UPDATE SET
  description  = EXCLUDED.description,
  color        = EXCLUDED.color,
  details      = EXCLUDED.details,
  is_active    = EXCLUDED.is_active,
  updated_at   = NOW();

-- =============================================================================
-- 2. Verify
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM classification_types WHERE name = 'Healthcare Worker'
  ) THEN
    RAISE EXCEPTION 'Healthcare Worker classification type not inserted';
  END IF;

  RAISE NOTICE 'Healthcare Worker classification type inserted successfully';
END $$;

-- Rollback
-- DELETE FROM classification_types WHERE name = 'Healthcare Worker';
