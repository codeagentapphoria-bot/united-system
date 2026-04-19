-- =============================================================================
-- Refresh-token jti migration + auth hot-path indexes
--
-- Removes the bcrypt-scan login hot path. Refresh tokens now correlate to DB
-- rows via the JWT `jti` claim (indexed), not via a stored bcrypt hash. The
-- old `token` column is kept nullable for one deploy cycle (rollback safety)
-- and will be dropped in a follow-up migration.
--
-- All existing refresh tokens are revoked as part of this migration (agreed
-- force-re-login) so the new unique NOT NULL jti constraint is safe to add:
-- application code will never look up the back-filled jtis; they only exist
-- to satisfy the constraint.
-- =============================================================================

-- 1. Make the legacy `token` column nullable so new rows can skip it.
ALTER TABLE "refresh_tokens" ALTER COLUMN "token" DROP NOT NULL;

-- 2. Add `jti` column (nullable initially so we can back-fill existing rows).
ALTER TABLE "refresh_tokens" ADD COLUMN "jti" TEXT;

-- 3. Back-fill every existing row with a random UUID. These jtis are never
--    matched by application code — the rows will be revoked in step 4 and
--    cleaned up by the existing token-cleanup job. The column is populated
--    only to make it safe to add NOT NULL + UNIQUE.
UPDATE "refresh_tokens" SET "jti" = gen_random_uuid()::text WHERE "jti" IS NULL;

-- 4. Revoke every active token. Forces re-login on next request. Safe because
--    the old bcrypt scan lookup is gone in the new code; any cookie issued
--    before this deploy lands on `findRefreshTokenByJwt` which cannot match
--    a revoked row.
UPDATE "refresh_tokens"
SET "revoked_at" = NOW(),
    "revoked_reason" = 'pre-jti-migration forced logout'
WHERE "revoked_at" IS NULL;

-- 5. Now the column can be NOT NULL and uniquely indexed.
ALTER TABLE "refresh_tokens" ALTER COLUMN "jti" SET NOT NULL;
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- 6. Drop the single-column legacy indexes that the new query patterns don't
--    use; replace with composite indexes aligned to the hot queries
--    (`revokeAllUserTokens`, cleanup job).
DROP INDEX IF EXISTS "refresh_tokens_token_idx";
DROP INDEX IF EXISTS "refresh_tokens_user_id_idx";
DROP INDEX IF EXISTS "refresh_tokens_resident_id_idx";

CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");
CREATE INDEX "refresh_tokens_resident_id_revoked_at_idx" ON "refresh_tokens"("resident_id", "revoked_at");
CREATE INDEX "refresh_tokens_created_at_idx" ON "refresh_tokens"("created_at");

-- 7. Portal login looks up residents by `username` OR `email`. `username` is
--    already indexed; add the matching index on `email`.
CREATE INDEX "residents_email_idx" ON "residents"("email");

-- 8. Google OAuth auto-link path searches residents by google_email. Index it.
CREATE INDEX "resident_credentials_google_email_idx" ON "resident_credentials"("google_email");

-- 9. Clean up orphaned sessions tied to revoked tokens. Prevents the
--    sessionTimeout middleware from hitting stale rows after the deploy.
DELETE FROM "sessions"
WHERE "refresh_token_id" IN (
  SELECT "id" FROM "refresh_tokens" WHERE "revoked_at" IS NOT NULL
);
