-- Migration: 14_fix_pages_resource_backfill
-- Only executes if pages.resource column exists (i.e., on DBs that ran the
-- original migration 11 before it was changed to a conditional no-op).
-- Fresh DBs skip all updates since the column was never created.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'resource') THEN
    -- Core system pages
    UPDATE "pages" SET "resource" = 'dashboard'       WHERE "id" = 'pg-core-dashboard';
    UPDATE "pages" SET "resource" = 'users'            WHERE "id" = 'pg-core-users';
    UPDATE "pages" SET "resource" = 'roles'             WHERE "id" = 'pg-core-roles';
    UPDATE "pages" SET "resource" = 'permissions'       WHERE "id" = 'pg-core-permissions';
    UPDATE "pages" SET "resource" = 'resources'         WHERE "id" = 'pg-core-resources';
    UPDATE "pages" SET "resource" = 'audit-logs'        WHERE "id" = 'pg-core-audit-logs';
    UPDATE "pages" SET "resource" = 'services'          WHERE "id" = 'pg-core-services';
    UPDATE "pages" SET "resource" = 'systems'           WHERE "id" = 'pg-core-systems';
    UPDATE "pages" SET "resource" = 'page-registry'     WHERE "id" = 'pg-core-page-registry';
    UPDATE "pages" SET "resource" = 'categories'         WHERE "id" = 'pg-core-categories';
    UPDATE "pages" SET "resource" = 'dynamic-forms'     WHERE "id" = 'pg-core-dynamic-forms';
    UPDATE "pages" SET "resource" = 'notifications'      WHERE "id" = 'pg-core-notifications';
    UPDATE "pages" SET "resource" = 'reports'            WHERE "id" = 'pg-core-reports';
    UPDATE "pages" SET "resource" = 'settings'           WHERE "id" = 'pg-core-settings';

    -- Libre-sakay pages
    UPDATE "pages" SET "resource" = 'libre-sakay-drivers'     WHERE "id" = 'pg-ls-drivers';
    UPDATE "pages" SET "resource" = 'libre-sakay-fares'       WHERE "id" = 'pg-ls-fares';
    UPDATE "pages" SET "resource" = 'libre-sakay-reports'     WHERE "id" = 'pg-ls-reports';
    UPDATE "pages" SET "resource" = 'libre-sakay-routes'      WHERE "id" = 'pg-ls-routes';
    UPDATE "pages" SET "resource" = 'libre-sakay-settings'    WHERE "id" = 'pg-ls-settings';
    UPDATE "pages" SET "resource" = 'libre-sakay-transactions' WHERE "id" = 'pg-ls-transactions';
    UPDATE "pages" SET "resource" = 'libre-sakay-vehicles'    WHERE "id" = 'pg-ls-vehicles';

    -- Government-programs pages
    UPDATE "pages" SET "resource" = 'government-programs-dashboard'       WHERE "id" = 'pg-gp-dashboard';
    UPDATE "pages" SET "resource" = 'government-programs-programs'       WHERE "id" = 'pg-gp-programs';
    UPDATE "pages" SET "resource" = 'government-programs-beneficiaries'  WHERE "id" = 'pg-gp-beneficiaries';
    UPDATE "pages" SET "resource" = 'government-programs-allocations'     WHERE "id" = 'pg-gp-allocations';
    UPDATE "pages" SET "resource" = 'government-programs-reports'          WHERE "id" = 'pg-gp-reports';
    UPDATE "pages" SET "resource" = 'government-programs-settings'        WHERE "id" = 'pg-gp-settings';

    -- Services pages
    UPDATE "pages" SET "resource" = 'services-dashboard'  WHERE "id" = 'pg-svc-dashboard';
    UPDATE "pages" SET "resource" = 'services-requests'      WHERE "id" = 'pg-svc-requests';
    UPDATE "pages" SET "resource" = 'services-documents'     WHERE "id" = 'pg-svc-documents';
    UPDATE "pages" SET "resource" = 'services-config'        WHERE "id" = 'pg-svc-config';
    UPDATE "pages" SET "resource" = 'services-reports'       WHERE "id" = 'pg-svc-reports';
    UPDATE "pages" SET "resource" = 'services-settings'      WHERE "id" = 'pg-svc-settings';

    RAISE NOTICE 'Migration 14: resource values fixed for existing pages.resource column';
  ELSE
    RAISE NOTICE 'Migration 14: pages.resource column not found — fresh DB, skipping';
  END IF;
END $$;
