-- =============================================================================
-- Migration: 17b_fix_partial_migration
-- Completes the partial UUID migration after migration 17 hit an FK error.
--
-- ROOT CAUSE:
--   Migration 17 ran in this order:
--     3a: role_permissions.role_id       → UUID ✓
--     3b: role_permissions.permission_id → UUID ✓ (but FK blocked — parent not updated!)
--     3c: role_pages.role_id            → UUID ✓
--     [ERROR: FK violation on role_pages/page_id — subsequent steps blocked]
--   Result:
--     - permissions.id: still old string IDs
--     - role_permissions.permission_id: new UUID (orphan, no matching permissions.id)
--     - role_pages.page_id: still old strings (3c step for page_id was BLOCKED)
--     - pages.id: still old strings
--     - eservice_users.id: still old strings
--
-- FIX STRATEGY: Deterministic UUIDs via md5(old_id || 'united-rbac-v1')::uuid::text
--   Same old ID → same new UUID every time. No temp tables, no gen_random_uuid().
--
-- HANDLING PARTIALLY-MIGRATED CHILDREN:
--   Migration 17's step 3b updated role_permissions.permission_id to gen_random_uuid()
--   values that don't match md5(). To fix the orphans:
--     - Update permissions.id to md5(old_id) → resolves orphan in role_permissions
--   Migration 17's step 3c partially ran for role_pages.role_id (valid UUID) but
--   was blocked before updating role_pages.page_id → still old strings.
--     - Step 4/5: pages.id → md5, then role_pages.page_id → md5
--   Migration 17 never reached step 3d for eservice_users.id.
--     - Step 6/7: eservice_users.id → md5, then user_roles.user_id → md5
--
-- ORDER:
--   1. Drop all FK constraints
--   2. permissions.id → deterministic UUID (resolves orphan in role_permissions)
--   3. role_permissions.permission_id strings → same deterministic UUID
--   4. pages.id → deterministic UUID
--   5. role_pages.page_id strings → same deterministic UUID
--   6. eservice_users.id → deterministic UUID
--   7. user_roles.user_id strings → same deterministic UUID
--   8. Re-enable all FKs + verify
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- STEP 1: Drop all FK constraints that block parent updates
-- =============================================================================

ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE public.role_pages      DROP CONSTRAINT IF EXISTS role_pages_page_id_fkey;
ALTER TABLE public.role_pages      DROP CONSTRAINT IF EXISTS role_pages_role_id_fkey;
ALTER TABLE public.user_roles      DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles      DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;

-- =============================================================================
-- STEP 2: permissions.id (parent) → deterministic UUID
-- Resolves orphan in role_permissions.permission_id (was updated to gen_random_uuid
-- in migration 17 — we now make permissions.id match that UUID)
-- =============================================================================

UPDATE public.permissions p
SET    id = md5(p.id || 'united-rbac-v1')::uuid::text
WHERE  p.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 3: role_permissions.permission_id strings → deterministic UUID
-- Rows already UUID from migration 17 are now valid (parent updated in step 2).
-- Rows still on old strings get updated to the deterministic UUID.
-- =============================================================================

UPDATE public.role_permissions rp
SET    permission_id = md5(rp.permission_id || 'united-rbac-v1')::uuid::text
WHERE  rp.permission_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 4: pages.id (parent) → deterministic UUID
-- =============================================================================

UPDATE public.pages pg
SET    id = md5(pg.id || 'united-rbac-v1')::uuid::text
WHERE  pg.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 5: role_pages.page_id strings → deterministic UUID
-- (migration 17 step 3c for page_id was blocked before running — all still string)
-- =============================================================================

UPDATE public.role_pages rp
SET    page_id = md5(rp.page_id || 'united-rbac-v1')::uuid::text
WHERE  rp.page_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 6: eservice_users.id (parent) → deterministic UUID
-- =============================================================================

UPDATE public.eservice_users u
SET    id = md5(u.id || 'united-rbac-v1')::uuid::text
WHERE  u.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 7: user_roles.user_id strings → deterministic UUID
-- =============================================================================

UPDATE public.user_roles ur
SET    user_id = md5(ur.user_id || 'united-rbac-v1')::uuid::text
WHERE  ur.user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =============================================================================
-- STEP 8: Re-enable all FK constraints
-- =============================================================================

ALTER TABLE public.role_permissions ADD FOREIGN KEY (role_id)       REFERENCES roles(id);
ALTER TABLE public.role_permissions ADD FOREIGN KEY (permission_id) REFERENCES permissions(id);
ALTER TABLE public.role_pages      ADD FOREIGN KEY (role_id)       REFERENCES roles(id);
ALTER TABLE public.role_pages    ADD FOREIGN KEY (page_id)       REFERENCES pages(id);
ALTER TABLE public.user_roles     ADD FOREIGN KEY (user_id)       REFERENCES eservice_users(id);
ALTER TABLE public.user_roles     ADD FOREIGN KEY (role_id)      REFERENCES roles(id);

-- =============================================================================
-- VERIFY
-- =============================================================================

DO $$
DECLARE
    rw RECORD;
    perm_cnt INTEGER;
    page_cnt INTEGER;
    user_cnt INTEGER;
    rp_orphan_cnt INTEGER;
    rpg_orphan_cnt INTEGER;
    ur_orphan_cnt INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Post-fix verification ===';

    perm_cnt := (SELECT COUNT(*) FROM permissions WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    page_cnt := (SELECT COUNT(*) FROM pages WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    user_cnt := (SELECT COUNT(*) FROM eservice_users WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

    RAISE NOTICE 'Non-UUID counts (all should be 0):';
    RAISE NOTICE '  roles:             %', (SELECT COUNT(*) FROM roles WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    RAISE NOTICE '  permissions:       %', perm_cnt;
    RAISE NOTICE '  pages:             %', page_cnt;
    RAISE NOTICE '  eservice_users:    %', user_cnt;
    RAISE NOTICE '  role_permissions:  %', (SELECT COUNT(*) FROM role_permissions WHERE role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR permission_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    RAISE NOTICE '  role_pages:        %', (SELECT COUNT(*) FROM role_pages WHERE role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR page_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    RAISE NOTICE '  user_roles:        %', (SELECT COUNT(*) FROM user_roles WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

    RAISE NOTICE '';
    RAISE NOTICE 'FK orphans (all should be 0):';
    rp_orphan_cnt := (SELECT COUNT(*) FROM role_permissions rp
         LEFT JOIN roles ro ON ro.id = rp.role_id
         LEFT JOIN permissions pe ON pe.id = rp.permission_id
         WHERE ro.id IS NULL OR pe.id IS NULL);
    RAISE NOTICE '  role_permissions orphans: %', rp_orphan_cnt;

    rpg_orphan_cnt := (SELECT COUNT(*) FROM role_pages rpg
         LEFT JOIN roles ro ON ro.id = rpg.role_id
         LEFT JOIN pages pg ON pg.id = rpg.page_id
         WHERE ro.id IS NULL OR pg.id IS NULL);
    RAISE NOTICE '  role_pages orphans:        %', rpg_orphan_cnt;

    ur_orphan_cnt := (SELECT COUNT(*) FROM user_roles ur
         LEFT JOIN eservice_users us ON us.id = ur.user_id
         LEFT JOIN roles ro ON ro.id = ur.role_id
         WHERE us.id IS NULL OR ro.id IS NULL);
    RAISE NOTICE '  user_roles orphans:        %', ur_orphan_cnt;

    RAISE NOTICE '';
    RAISE NOTICE 'Sample permissions (first 5):';
    FOR rw IN SELECT id, resource, action FROM permissions ORDER BY resource LIMIT 5 LOOP
        RAISE NOTICE '  % / % / %', rw.id, rw.resource, rw.action;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Sample pages (first 5):';
    FOR rw IN SELECT id, path FROM pages ORDER BY path LIMIT 5 LOOP
        RAISE NOTICE '  % / %', rw.id, rw.path;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Sample eservice_users (first 5):';
    FOR rw IN SELECT id, email FROM eservice_users ORDER BY email LIMIT 5 LOOP
        RAISE NOTICE '  % / %', rw.id, rw.email;
    END LOOP;
END $$;
