-- Remove unique constraint from redirect_page_id
-- Multiple roles can now share the same redirect page (one role = one redirect, but redirect can be shared)

DROP INDEX IF EXISTS "roles_redirect_page_id_key";
DROP INDEX IF EXISTS "roles_redirect_page_id_unique_if_not_null";
