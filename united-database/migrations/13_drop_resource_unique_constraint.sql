-- Migration: 13_drop_resource_unique_constraint
-- Removes the UNIQUE(system, resource) constraint from pages table.
-- Multiple pages can share the same resource (e.g. all e-government submenu items
-- have resource='e-government') — they map to the same permission.
-- Resource matching is enforced in application logic, not the DB.

ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_system_resource_unique";
