-- Migration: 11_add_resource_to_pages
-- Adds resource column to pages table and backfills from existing paths
-- /admin/libre-sakay/dashboard → libre-sakay-dashboard
-- /admin/dashboard → dashboard

-- 1. Add resource column (nullable first, backfill, then add constraints)
ALTER TABLE "pages" ADD COLUMN "resource" TEXT;

-- 2. Backfill resource from path
UPDATE "pages"
SET "resource" = (
  CASE
    -- If path has 4+ segments (/admin/libre-sakay/dashboard → libre-sakay-dashboard)
    WHEN array_length(string_to_array("path", '/'), 1) >= 4
    THEN array_to_string(array_slice(string_to_array("path", '/'), 2, 4), '-')
    -- If path has exactly 3 segments (/admin/dashboard → dashboard)
    WHEN array_length(string_to_array("path", '/'), 1) = 3
    THEN array_to_string(array_slice(string_to_array("path", '/'), 2, 3), '-')
    -- Fallback for unusual paths
    ELSE regexp_replace("path", '^/', '', 'g')
  END
);

-- 3. Make NOT NULL
ALTER TABLE "pages" ALTER COLUMN "resource" SET NOT NULL;

-- 4. Add unique constraint on (system, resource)
ALTER TABLE "pages" ADD CONSTRAINT "pages_system_resource_unique" UNIQUE ("system", "resource");
