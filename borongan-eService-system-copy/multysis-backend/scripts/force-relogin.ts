/**
 * Force every active user to re-authenticate on their next request.
 *
 * Usage:
 *   npx ts-node scripts/force-relogin.ts [--reason "why"]
 *
 * Revokes all active refresh tokens and deletes all rows in `sessions`. The
 * next request from any live cookie will fail the DB-backed lookup and the
 * client will be redirected to the login page. Access-token cookies expire
 * on their own within ACCESS_TOKEN_EXPIRES (default 10m) or are overridden
 * by the 401 response cleaning them up.
 *
 * This runs outside of any migration so it can be used for:
 *   - Incident response (compromised token material)
 *   - Ad-hoc maintenance after a code change that altered token semantics
 *
 * The jti-migration already revokes existing tokens once; this script is for
 * subsequent events.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const reason = (() => {
  const flagIdx = process.argv.indexOf('--reason');
  if (flagIdx >= 0 && process.argv[flagIdx + 1]) return process.argv[flagIdx + 1];
  return 'Operator-initiated forced logout';
})();

const main = async () => {
  const now = new Date();

  const revoked = await prisma.refreshToken.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: now, revokedReason: reason },
  });

  const sessionsDeleted = await prisma.session.deleteMany({});

  console.log(`Refresh tokens revoked: ${revoked.count}`);
  console.log(`Sessions cleared:       ${sessionsDeleted.count}`);
  console.log(`Reason:                 ${reason}`);
};

main()
  .catch((err) => {
    console.error('force-relogin failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
