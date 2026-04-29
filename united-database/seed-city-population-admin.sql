-- =============================================================================
-- SEED DATA — City Population Admin User
-- =============================================================================
-- Creates the City Population admin user for the E-Services admin portal.
-- This enables the City Population admin panel at /admin/city-population.
--
-- HOW TO RUN:
--   psql "$UNIFIED_DB_URL" -f seed-city-population-admin.sql
--
-- IDEMPOTENT: Uses INSERT ... ON CONFLICT DO NOTHING.
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- City Population Admin Role
-- =============================================================================
INSERT INTO public.roles (
    id,
    name,
    display_name,
    description,
    system,
    created_at,
    updated_at
) VALUES (
    'role-city-pop-admin',
    'city_pop_admin',
    'City Population Admin',
    'Administrator for City Population management system',
    'city-population',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- City Population Admin User
-- =============================================================================
-- Password: Admin1234! (bcrypt hash — same as existing admin users)
INSERT INTO public.eservice_users (
    id,
    email,
    password,
    name,
    role,
    created_at,
    updated_at
) VALUES (
    'user-city-pop-admin',
    'citypop@eservice.gov.ph',
    '$2b$10$j1QPwuezqna1qV98KfLdRuyUHxqLl8TgNmpoVsIayGGqPqMmSbPq2',
    'City Population Admin',
    'city_pop_admin',
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- Assign the city_pop_admin role to the user
INSERT INTO public.user_roles (id, user_id, role_id, created_at) VALUES
    ('ur-cp-admin', 'user-city-pop-admin', 'role-city-pop-admin', now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Assign page access — role_pages for city_pop_admin role
-- =============================================================================
INSERT INTO public.role_pages (id, role_id, page_id, created_at) VALUES
    ('rp-cp-admin-city-pop',     'role-city-pop-admin', '3854ce44-49ec-4833-a033-839f90f269cf', now()),
    ('rp-cp-admin-dashboard',     'role-city-pop-admin', '3b26481e-93f2-4159-a656-c88857e459c6', now()),
    ('rp-cp-admin-registrations', 'role-city-pop-admin', 'fc9f47e1-1832-4818-b49e-b4f405c6c050', now()),
    ('rp-cp-admin-residents',     'role-city-pop-admin', '526ec0b0-1d99-437f-be16-27268d70fb92', now())
ON CONFLICT (id) DO NOTHING;
