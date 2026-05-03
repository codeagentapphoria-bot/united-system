-- Migration: 22_seed_city_population_pages
-- Seeds pages for the City Population admin section.

INSERT INTO "pages" ("id", "system", "path", "name") VALUES
  -- City Population dynamic route (/admin/city-population/:section)
  ('3854ce44-49ec-4833-a033-839f90f269cf', 'city-population', '/admin/city-population',              'City Population'),
  ('3b26481e-93f2-4159-a656-c88857e459c6', 'city-population', '/admin/city-population/dashboard',   'Dashboard'),
  ('fc9f47e1-1832-4818-b49e-b4f405c6c050', 'city-population', '/admin/city-population/registrations', 'Registrations'),
  ('526ec0b0-1d99-437f-be16-27268d70fb92', 'city-population', '/admin/city-population/residents',     'Residents')

ON CONFLICT ("system", "path") DO NOTHING;
