-- =============================================================================
-- Government Programs v2 Migration
-- Run this BEFORE running `npx prisma db push` on the updated schema.
-- =============================================================================

-- Step 1: Add the new `types` array column alongside the old `type` column.
ALTER TABLE "government_programs"
  ADD COLUMN IF NOT EXISTS "types" "government_program_type"[] NOT NULL DEFAULT '{}';

-- Step 2: Add requirements column.
ALTER TABLE "government_programs"
  ADD COLUMN IF NOT EXISTS "requirements" TEXT;

-- Step 3: Copy existing single `type` values into the new `types` array.
--         Each row gets its old type wrapped in a 1-element array.
UPDATE "government_programs"
SET "types" = ARRAY["type"::"government_program_type"]
WHERE array_length("types", 1) IS NULL OR array_length("types", 1) = 0;

-- Step 4: Libre Sakay is for Students, Senior Citizens, and PWD — not "ALL residents".
UPDATE "government_programs"
SET "types" = ARRAY[
  'STUDENT'::"government_program_type",
  'SENIOR_CITIZEN'::"government_program_type",
  'PWD'::"government_program_type"
]
WHERE id = 'gp-all-libre-sakay';

-- Step 5: Drop the old `type` column (data already migrated to `types`).
ALTER TABLE "government_programs"
  DROP COLUMN IF EXISTS "type";

-- Step 6: Drop the old index on `type` (no longer exists).
DROP INDEX IF EXISTS "government_programs_type_idx";

-- Step 7: Create the government_program_applications table.
CREATE TABLE IF NOT EXISTS "government_program_applications" (
  "id"           TEXT         NOT NULL,
  "resident_id"  TEXT         NOT NULL,
  "program_id"   TEXT         NOT NULL,
  "status"       TEXT         NOT NULL DEFAULT 'pending',
  "admin_notes"  TEXT,
  "applied_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "reviewed_at"  TIMESTAMPTZ,
  "reviewed_by"  INTEGER,
  "suspended_at" TIMESTAMPTZ,
  CONSTRAINT "government_program_applications_pkey" PRIMARY KEY ("id")
);

-- Step 8: Foreign keys.
ALTER TABLE "government_program_applications"
  DROP CONSTRAINT IF EXISTS "government_program_applications_resident_id_fkey";
ALTER TABLE "government_program_applications"
  ADD CONSTRAINT "government_program_applications_resident_id_fkey"
    FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "government_program_applications"
  DROP CONSTRAINT IF EXISTS "government_program_applications_program_id_fkey";
ALTER TABLE "government_program_applications"
  ADD CONSTRAINT "government_program_applications_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "government_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "government_program_applications_resident_id_program_id_key"
  ON "government_program_applications" ("resident_id", "program_id");

CREATE INDEX IF NOT EXISTS "government_program_applications_status_idx"
  ON "government_program_applications" ("status");

CREATE INDEX IF NOT EXISTS "government_program_applications_program_id_idx"
  ON "government_program_applications" ("program_id");
