-- Fix: user_roles FK constraints missing ON DELETE CASCADE
-- Migration 17b recreated these FKs without cascade, breaking user deletion

-- Drop existing FK constraints
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;

-- Re-create with ON DELETE CASCADE
ALTER TABLE public.user_roles ADD FOREIGN KEY (user_id) REFERENCES eservice_users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
