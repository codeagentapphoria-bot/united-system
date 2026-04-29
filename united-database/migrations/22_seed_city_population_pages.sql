-- Migration: 22_seed_city_population_pages
-- Seeds pages for the City Population admin section.

INSERT INTO "pages" ("id", "system", "path", "name", "resource") VALUES
  -- City Population dynamic route (/admin/city-population/:section)
  ('pg-cp-city-population',        'city-population', '/admin/city-population',              'City Population',          'city-population'),
  ('pg-cp-dashboard',             'city-population', '/admin/city-population/dashboard',   'Dashboard',                'city-population'),
  ('pg-cp-registrations',         'city-population', '/admin/city-population/registrations','Registrations',            'city-population'),
  ('pg-cp-residents',             'city-population', '/admin/city-population/residents',    'Residents',                'city-population')

ON CONFLICT ("system", "path") DO NOTHING;
