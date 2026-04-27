-- =============================================================================
-- Diagnostic: Inspect actual state of RBAC tables BEFORE running migration 17
-- Run first to understand what's in each table and identify orphans.
--
-- Usage: psql "$UNIFIED_DB_URL" -f united-database/migrations/17a_diagnostic.sql
-- =============================================================================

SET search_path TO public;

-- 1. All roles
SELECT 'roles' AS tbl, id, name FROM roles ORDER BY name;

-- 2. All permissions
SELECT 'permissions' AS tbl, id, resource, action FROM permissions ORDER BY id;

-- 3. All pages
SELECT 'pages' AS tbl, id, path FROM pages ORDER BY id;

-- 4. All eservice_users
SELECT 'eservice_users' AS tbl, id, email FROM eservice_users ORDER BY email;

-- 5. role_permissions — find orphaned permission_ids and role_ids
SELECT
    'role_permissions' AS tbl,
    rp.role_id,
    rp.permission_id,
    CASE WHEN r.id IS NULL THEN 'ORPHAN_role' ELSE 'ok' END AS role_status,
    CASE WHEN p.id IS NULL THEN 'ORPHAN_permission' ELSE 'ok' END AS perm_status
FROM role_permissions rp
LEFT JOIN roles r ON r.id = rp.role_id
LEFT JOIN permissions p ON p.id = rp.permission_id
ORDER BY rp.role_id;

-- 6. role_pages — find orphaned role_ids and page_ids
SELECT
    'role_pages' AS tbl,
    rp.role_id,
    rp.page_id,
    CASE WHEN r.id IS NULL THEN 'ORPHAN_role' ELSE 'ok' END AS role_status,
    CASE WHEN pg.id IS NULL THEN 'ORPHAN_page' ELSE 'ok' END AS page_status
FROM role_pages rp
LEFT JOIN roles r ON r.id = rp.role_id
LEFT JOIN pages pg ON pg.id = rp.page_id
ORDER BY rp.role_id;

-- 7. user_roles — find orphaned user_ids and role_ids
SELECT
    'user_roles' AS tbl,
    ur.user_id,
    ur.role_id,
    CASE WHEN u.id IS NULL THEN 'ORPHAN_user' ELSE 'ok' END AS user_status,
    CASE WHEN r.id IS NULL THEN 'ORPHAN_role' ELSE 'ok' END AS role_status
FROM user_roles ur
LEFT JOIN eservice_users u ON u.id = ur.user_id
LEFT JOIN roles r ON r.id = ur.role_id
ORDER BY ur.user_id;

-- 8. Count of non-UUID IDs per table
SELECT 'non-UUID roles' AS check_name, COUNT(*) AS count FROM roles WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID permissions', COUNT(*) FROM permissions WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID pages', COUNT(*) FROM pages WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID eservice_users', COUNT(*) FROM eservice_users WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID role_permissions.role_id', COUNT(*) FROM role_permissions WHERE role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID role_permissions.permission_id', COUNT(*) FROM role_permissions WHERE permission_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID role_pages.role_id', COUNT(*) FROM role_pages WHERE role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID role_pages.page_id', COUNT(*) FROM role_pages WHERE page_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID user_roles.user_id', COUNT(*) FROM user_roles WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'non-UUID user_roles.role_id', COUNT(*) FROM user_roles WHERE role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
