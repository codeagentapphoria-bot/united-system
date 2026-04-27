-- Migration: 10_add_pages_and_system_to_roles
-- Adds Page table + Role.system + Role.redirectPageId FK to Page.id

-- 1. Create pages table
CREATE TABLE IF NOT EXISTS "pages" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "system" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pages_system_path_unique" UNIQUE ("system", "path")
);

-- 2. Add system column to roles (must be NOT NULL, set default first)
ALTER TABLE "roles" ADD COLUMN "system" TEXT NOT NULL DEFAULT 'core';

-- 3. Add redirect_page_id column to roles
ALTER TABLE "roles" ADD COLUMN "redirect_page_id" TEXT UNIQUE;

-- 4. Add FK constraint
ALTER TABLE "roles" ADD CONSTRAINT "roles_redirect_page_id_fkey"
  FOREIGN KEY ("redirect_page_id") REFERENCES "pages"("id") ON DELETE SET NULL;

-- 5. Seed pages per system (from admin-menu.tsx)
INSERT INTO "pages" ("id", "system", "path", "name") VALUES
  -- CORE pages
  ('pg-core-dashboard',      'core',               '/admin/dashboard',                 'Dashboard'),
  ('pg-core-users',          'core',               '/admin/users',                    'Users'),
  ('pg-core-roles',          'core',               '/admin/roles',                    'Roles'),
  ('pg-core-permissions',    'core',               '/admin/permissions',               'Permissions'),
  ('pg-core-resources',      'core',               '/admin/resources',                 'Resources'),
  ('pg-core-audit-logs',    'core',               '/admin/audit-logs',                'Audit Logs'),
  ('pg-core-services',       'core',               '/admin/services',                  'Services'),
  ('pg-core-systems',        'core',               '/admin/systems',                   'Systems'),
  ('pg-core-page-registry',  'core',               '/admin/page-registry',             'Page Registry'),
  ('pg-core-categories',     'core',               '/admin/categories',                'Categories'),
  ('pg-core-dynamic-forms',  'core',               '/admin/dynamic-forms',             'Dynamic Forms'),
  ('pg-core-notifications',  'core',               '/admin/notifications',              'Notifications'),
  ('pg-core-reports',       'core',               '/admin/reports',                   'Reports'),
  ('pg-core-settings',       'core',               '/admin/settings',                  'Settings'),

  -- LIBRE-SAKAY pages
  ('pg-ls-dashboard',      'libre-sakay',        '/admin/libre-sakay/dashboard',           'Dashboard'),
  ('pg-ls-transactions',   'libre-sakay',        '/admin/libre-sakay/transactions',        'Transactions'),
  ('pg-ls-drivers',        'libre-sakay',        '/admin/libre-sakay/drivers',             'Drivers'),
  ('pg-ls-vehicles',       'libre-sakay',        '/admin/libre-sakay/vehicles',           'Vehicles'),
  ('pg-ls-routes',         'libre-sakay',        '/admin/libre-sakay/routes',             'Routes'),
  ('pg-ls-fares',          'libre-sakay',        '/admin/libre-sakay/fares',             'Fares'),
  ('pg-ls-reports',        'libre-sakay',        '/admin/libre-sakay/reports',             'Reports'),
  ('pg-ls-settings',        'libre-sakay',        '/admin/libre-sakay/settings',           'Settings'),

  -- GOVERNMENT-PROGRAMS pages
  ('pg-gp-dashboard',      'government-programs', '/admin/government-programs/dashboard',   'Dashboard'),
  ('pg-gp-programs',       'government-programs', '/admin/government-programs/programs',    'Programs'),
  ('pg-gp-beneficiaries',  'government-programs', '/admin/government-programs/beneficiaries','Beneficiaries'),
  ('pg-gp-allocations',    'government-programs', '/admin/government-programs/allocations',  'Allocations'),
  ('pg-gp-reports',        'government-programs', '/admin/government-programs/reports',    'Reports'),
  ('pg-gp-settings',       'government-programs', '/admin/government-programs/settings',    'Settings'),

  -- SERVICES pages
  ('pg-svc-dashboard',     'services',           '/admin/services/dashboard',             'Dashboard'),
  ('pg-svc-requests',      'services',           '/admin/services/requests',             'Requests'),
  ('pg-svc-documents',     'services',           '/admin/services/documents',             'Documents'),
  ('pg-svc-config',        'services',           '/admin/services/config',               'Configuration'),
  ('pg-svc-reports',       'services',           '/admin/services/reports',               'Reports'),
  ('pg-svc-settings',       'services',           '/admin/services/settings',             'Settings')

ON CONFLICT ("system", "path") DO NOTHING;

-- 6. Update existing roles to have 'core' as default system
UPDATE "roles" SET "system" = 'core' WHERE "system" IS NULL;

-- 7. Make system NOT NULL after default is set
ALTER TABLE "roles" ALTER COLUMN "system" DROP DEFAULT;
