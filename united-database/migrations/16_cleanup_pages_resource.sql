-- Migration: 16_cleanup_pages_resource
-- Removes the orphaned pages.resource column added by migration 11.
-- This column was used in a broken resource-string matching approach for
-- sidebar visibility that has been replaced by role_pages junction table.

ALTER TABLE public.pages DROP COLUMN IF EXISTS resource;
