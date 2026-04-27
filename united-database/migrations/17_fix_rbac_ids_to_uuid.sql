-- =============================================================================
-- Migration: 17_fix_rbac_ids_to_uuid
-- Converts all RBAC string IDs to deterministic UUIDs.
--
-- Strategy: md5(old_id || 'united-rbac-v1')::uuid::text
--   Same old ID always produces the same UUID — idempotent, no temp tables.
--   Already-UUID rows are skipped (WHERE clause).
--
-- ORDER (children → parents to preserve FK integrity):
--   1. Drop FK constraints
--   2. Update role_permissions (child of roles + permissions)
--   3. Update role_pages (child of roles + pages)
--   4. Update user_roles (child of users + roles)
--   5. Update eservice_users (parent)
--   6. Update roles (parent)
--   7. Update permissions (parent)
--   8. Update pages (parent)
--   9. Restore FK constraints
--   10. Verify
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- STEP 1: Drop FK constraints
-- =============================================================================

ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE public.role_pages      DROP CONSTRAINT IF EXISTS role_pages_page_id_fkey;
ALTER TABLE public.role_pages      DROP CONSTRAINT IF EXISTS role_pages_role_id_fkey;
ALTER TABLE public.user_roles      DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles      DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;

-- =============================================================================
-- STEP 2: role_permissions — children first
-- =============================================================================

UPDATE public.role_permissions rp
SET    role_id = md5(rp.role_id || 'united-rbac-v1')::uuid::text
WHERE  rp.role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.role_permissions rp
SET    permission_id = md5(rp.permission_id || 'united-rbac-v1')::uuid::text
WHERE  rp.permission_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 3: role_pages
-- =============================================================================

UPDATE public.role_pages rp
SET    role_id = md5(rp.role_id || 'united-rbac-v1')::uuid::text
WHERE  rp.role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.role_pages rp
SET    page_id = md5(rp.page_id || 'united-rbac-v1')::uuid::text
WHERE  rp.page_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 4: user_roles
-- =============================================================================

UPDATE public.user_roles ur
SET    user_id = md5(ur.user_id || 'united-rbac-v1')::uuid::text
WHERE  ur.user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.user_roles ur
SET    role_id = md5(ur.role_id || 'united-rbac-v1')::uuid::text
WHERE  ur.role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 5: eservice_users (parent — no FK children)
-- =============================================================================

UPDATE public.eservice_users u
SET    id = md5(u.id || 'united-rbac-v1')::uuid::text
WHERE  u.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 6: roles (parent)
-- =============================================================================

UPDATE public.roles r
SET    id = md5(r.id || 'united-rbac-v1')::uuid::text
WHERE  r.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 7: permissions (parent)
-- =============================================================================

UPDATE public.permissions p
SET    id = md5(p.id || 'united-rbac-v1')::uuid::text
WHERE  p.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 8: pages (parent)
-- =============================================================================

UPDATE public.pages pg
SET    id = md5(pg.id || 'united-rbac-v1')::uuid::text
WHERE  pg.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 9: Restore FK constraints
-- =============================================================================

ALTER TABLE public.role_permissions ADD FOREIGN KEY (role_id)       REFERENCES roles(id);
ALTER TABLE public.role_permissions ADD FOREIGN KEY (permission_id) REFERENCES permissions(id);
ALTER TABLE public.role_pages      ADD FOREIGN KEY (role_id)       REFERENCES roles(id);
ALTER TABLE public.role_pages      ADD FOREIGN KEY (page_id)      REFERENCES pages(id);
ALTER TABLE public.user_roles      ADD FOREIGN KEY (user_id)     REFERENCES eservice_users(id);
ALTER TABLE public.user_roles      ADD FOREIGN KEY (role_id)      REFERENCES roles(id);

-- =============================================================================
-- STEP 10: Verify
-- =============================================================================

DO $$
DECLARE
    rw RECORD;
    cnt INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== UUID migration verification ===';

    -- Non-UUID counts
    RAISE NOTICE '';
    RAISE NOTICE 'Non-UUID counts (0 = migrated):';
    FOR rw IN SELECT 'roles'           AS tbl, COUNT(*) AS cnt FROM roles          WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' UNION ALL
                  SELECT 'permissions',         COUNT(*) FROM permissions    WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' UNION ALL
                  SELECT 'pages',              COUNT(*) FROM pages          WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' UNION ALL
                  SELECT 'eservice_users',     COUNT(*) FROM eservice_users WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' UNION ALL
                  SELECT 'role_permissions',    COUNT(*) FROM role_permissions WHERE role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR permission_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' UNION ALL
                  SELECT 'role_pages',          COUNT(*) FROM role_pages WHERE role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR page_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' UNION ALL
                  SELECT 'user_roles',           COUNT(*) FROM user_roles WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        RAISE NOTICE '  %: %', rw.tbl, rw.cnt;
    END LOOP;

    -- FK orphans
    RAISE NOTICE '';
    RAISE NOTICE 'FK orphans (0 = clean):';
    cnt := (SELECT COUNT(*) FROM role_permissions rp LEFT JOIN roles ro ON ro.id = rp.role_id LEFT JOIN permissions pe ON pe.id = rp.permission_id WHERE ro.id IS NULL OR pe.id IS NULL);
    RAISE NOTICE '  role_permissions: %', cnt;
    cnt := (SELECT COUNT(*) FROM role_pages rpg LEFT JOIN roles ro ON ro.id = rpg.role_id LEFT JOIN pages pg ON pg.id = rpg.page_id WHERE ro.id IS NULL OR pg.id IS NULL);
    RAISE NOTICE '  role_pages:      %', cnt;
    cnt := (SELECT COUNT(*) FROM user_roles ur LEFT JOIN eservice_users us ON us.id = ur.user_id LEFT JOIN roles ro ON ro.id = ur.role_id WHERE us.id IS NULL OR ro.id IS NULL);
    RAISE NOTICE '  user_roles:       %', cnt;

    -- Samples
    RAISE NOTICE '';
    RAISE NOTICE 'Sample permissions (first 3):';
    FOR rw IN SELECT id, resource, action FROM permissions ORDER BY resource LIMIT 3 LOOP
        RAISE NOTICE '  % / % / %', rw.id, rw.resource, rw.action;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Sample pages (first 3):';
    FOR rw IN SELECT id, path FROM pages ORDER BY path LIMIT 3 LOOP
        RAISE NOTICE '  % / %', rw.id, rw.path;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Sample eservice_users (first 3):';
    FOR rw IN SELECT id, email FROM eservice_users ORDER BY email LIMIT 3 LOOP
        RAISE NOTICE '  % / %', rw.id, rw.email;
    END LOOP;
END $$;
