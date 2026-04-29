-- Migration: 11_add_systems_table
-- Creates systems table with slug + label.
-- Pages and roles continue to reference system via TEXT column (no FK constraint
-- added here to avoid column type migration; application logic enforces referential integrity).
-- Seed populates all current system values plus 'unassigned' fallback.

-- 1. Create systems table
CREATE TABLE IF NOT EXISTS "systems" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "slug"       TEXT NOT NULL UNIQUE,
  "label"      TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed existing systems + 'unassigned' fallback
--   Current pages.system / roles.system values: core, libre-sakay, libre-medisina,
--   government-programs, services
INSERT INTO "systems" ("slug", "label") VALUES
  ('core',                'Core'),
  ('libre-sakay',        'Libre Sakay'),
  ('libre-medisina',     'Libre Medisina'),
  ('government-programs', 'Government Programs'),
  ('services',           'E-Government Services'),
  ('unassigned',          'Unassigned')
ON CONFLICT (slug) DO NOTHING;
