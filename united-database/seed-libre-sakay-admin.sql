-- =============================================================================
-- SEED DATA — LibreSakay Admin User
-- =============================================================================
-- Creates the LibreSakay admin user for the E-Services admin portal.
-- This enables the LibreSakay admin panel at /admin/libre-sakay.
--
-- HOW TO RUN:
--   psql "$UNIFIED_DB_URL" -f seed-libre-sakay-admin.sql
--
-- IDEMPOTENT: Uses INSERT ... ON CONFLICT DO NOTHING.
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- LibreSakay Admin User
-- =============================================================================
-- Password: Admin1234! (bcrypt hash — same as existing admin users)
-- Role: libre_sakay_admin (frontend ProtectedRoute checks this exact value)
-- Type: admin (backend verifyAdmin checks token.type === 'admin', which is
--       hardcoded by adminLogin regardless of database role value)
-- =============================================================================

INSERT INTO public.eservice_users (
    id,
    email,
    password,
    name,
    role,
    created_at,
    updated_at
) VALUES (
    'user-libre-sakay-admin',
    'sakay@eservice.gov.ph',
    '$2b$10$j1QPwuezqna1qV98KfLdRuyUHxqLl8TgNmpoVsIayGGqPqMmSbPq2',
    'LibreSakay Admin',
    'libre_sakay_admin',
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- Assign the libre_sakay_admin role to the user
INSERT INTO public.user_roles (id, user_id, role_id, created_at) VALUES
    ('ur-ls-admin', 'user-libre-sakay-admin', 'role-libre-sakay-admin', now())
ON CONFLICT (id) DO NOTHING;
