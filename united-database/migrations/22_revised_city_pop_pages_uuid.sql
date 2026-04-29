-- Migration: 22_revised_city_pop_pages_uuid
-- Fixes page IDs from string slugs (pg-cp-*) to UUIDs.
-- Handles circular FK: pages.id <-- role_pages.page_id
-- Run AFTER the original buggy seed that inserted pg-cp-* slugs.

DO $$
DECLARE
  fk_name text;
BEGIN
  -- 1. Find the FK constraint name on role_pages.page_id
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'role_pages'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'page_id';

  -- 2. Drop the FK constraint
  EXECUTE format('ALTER TABLE public.role_pages DROP CONSTRAINT %I', fk_name);
  RAISE NOTICE 'Dropped FK constraint: %', fk_name;
END;
$$;

-- 3. Update pages.id from slug to UUID
UPDATE "pages" SET id = '3854ce44-49ec-4833-a033-839f90f269cf'
  WHERE id = 'pg-cp-city-population' AND system = 'city-population';

UPDATE "pages" SET id = '3b26481e-93f2-4159-a656-c88857e459c6'
  WHERE id = 'pg-cp-dashboard' AND system = 'city-population';

UPDATE "pages" SET id = 'fc9f47e1-1832-4818-b49e-b4f405c6c050'
  WHERE id = 'pg-cp-registrations' AND system = 'city-population';

UPDATE "pages" SET id = '526ec0b0-1d99-437f-be16-27268d70fb92'
  WHERE id = 'pg-cp-residents' AND system = 'city-population';

-- 4. Update role_pages.page_id from slug to UUID
UPDATE "role_pages" SET page_id = '3854ce44-49ec-4833-a033-839f90f269cf'
  WHERE page_id = 'pg-cp-city-population';

UPDATE "role_pages" SET page_id = '3b26481e-93f2-4159-a656-c88857e459c6'
  WHERE page_id = 'pg-cp-dashboard';

UPDATE "role_pages" SET page_id = 'fc9f47e1-1832-4818-b49e-b4f405c6c050'
  WHERE page_id = 'pg-cp-registrations';

UPDATE "role_pages" SET page_id = '526ec0b0-1d99-437f-be16-27268d70fb92'
  WHERE page_id = 'pg-cp-residents';

-- 5. Recreate the FK constraint
ALTER TABLE public.role_pages
  ADD CONSTRAINT role_pages_page_id_fkey
  FOREIGN KEY (page_id)
  REFERENCES public.pages(id)
  ON DELETE CASCADE;
