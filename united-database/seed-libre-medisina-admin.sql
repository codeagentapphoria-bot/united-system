-- =============================================================================
-- SEED: Libre Medisina Admin — Role, Permissions, Default User
-- =============================================================================
-- Run after the main seed.sql has been applied.
-- Idempotent: Uses INSERT ... ON CONFLICT DO NOTHING throughout.
--
-- HOW TO RUN:
--   psql "$UNIFIED_DB_URL" -f seed-libre-medisina-admin.sql
-- =============================================================================

SET search_path TO public;

-- Role
INSERT INTO public.roles (id, name, description, created_at, updated_at) VALUES
    ('role-libre-medisina-admin', 'libre_medisina_admin', 'Libre Medisina administrator — manages prescription requests', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Permissions
INSERT INTO public.permissions (id, resource, action, created_at, updated_at) VALUES
    ('perm-medicine-requests-all',  'medicine_requests', 'ALL',  now(), now()),
    ('perm-medicine-requests-read', 'medicine_requests', 'READ', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Role <-> Permission mappings
INSERT INTO public.role_permissions (id, role_id, permission_id, created_at) VALUES
    ('rp-lm-med-all',  'role-libre-medisina-admin', 'perm-medicine-requests-all',  now()),
    ('rp-lm-med-read', 'role-libre-medisina-admin', 'perm-medicine-requests-read', now())
ON CONFLICT (id) DO NOTHING;

-- Default Libre Medisina Admin user
-- Password: Admin1234! (same bcrypt hash as the default E-Service admin)
INSERT INTO public.eservice_users (id, email, password, name, role, created_at, updated_at) VALUES
    ('user-libre-medisina-admin',
     'medisina@eservice.gov.ph',
     '$2b$10$y3QB5FpC8AWOLcfLbrij6eWCM0zJ8/t37k5Bj/UiKcNq6uf7yjoLe',
     'Libre Medisina Admin',
     'libre_medisina_admin',
     now(), now())
ON CONFLICT (email) DO NOTHING;

-- Assign role to the default user
INSERT INTO public.user_roles (id, user_id, role_id, created_at) VALUES
    ('ur-lm-admin', 'user-libre-medisina-admin', 'role-libre-medisina-admin', now())
ON CONFLICT (id) DO NOTHING;

-- Also give super_admin access to medicine_requests
INSERT INTO public.role_permissions (id, role_id, permission_id, created_at) VALUES
    ('rp-sa-med-all', 'role-super-admin', 'perm-medicine-requests-all', now())
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '=== Libre Medisina Admin seed applied ===';
    RAISE NOTICE '  Role: libre_medisina_admin';
    RAISE NOTICE '  Default user: medisina@eservice.gov.ph / Admin1234!';
END$$;
