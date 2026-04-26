-- Migration: 18_add_cascade_delete_to_role_pages
-- Description: Add ON DELETE CASCADE to role_pages FK constraints so page/role deletes cascade properly
-- Created: 2026-04-26

-- ============================================================================
-- STEP 1: Drop existing FK constraints (if they exist)
-- ============================================================================

ALTER TABLE public.role_pages DROP CONSTRAINT IF EXISTS role_pages_page_id_fkey;
ALTER TABLE public.role_pages DROP CONSTRAINT IF EXISTS role_pages_role_id_fkey;

-- ============================================================================
-- STEP 2: Re-create FK constraints with ON DELETE CASCADE
-- ============================================================================

-- role_pages -> pages: cascade delete when page is deleted
ALTER TABLE public.role_pages
ADD CONSTRAINT role_pages_page_id_fkey
FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE;

-- role_pages -> roles: cascade delete when role is deleted
ALTER TABLE public.role_pages
ADD CONSTRAINT role_pages_role_id_fkey
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: Verify
-- ============================================================================

SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'role_pages';
