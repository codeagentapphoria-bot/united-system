/**
 * fix-senior-pivots.js
 *
 * Inserts missing beneficiary_program_pivots for all 2,593 senior citizens.
 *
 * beneficiary_type = 'SENIOR_CITIZEN'
 * beneficiary_id  = senior_citizen_id  (e.g. SC-2026-0001)
 * program_id      = Senior Citizen Allowance UUID
 * status         = 'active'
 *
 * Uses PostgreSQL gen_random_uuid() so no UUID params needed.
 * ON CONFLICT DO NOTHING — safe to re-run.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

const PROGRAM_ID = '00000501-0501-4001-8001-000000000004';
const BATCH_SIZE = 50;

async function main() {
  const prog = await prisma.governmentProgram.findUnique({ where: { id: PROGRAM_ID } });
  if (!prog) { console.error('Program not found:', PROGRAM_ID); process.exit(1); }
  console.log('Program:', prog.name, '(' + PROGRAM_ID + ')');

  const seniors = await prisma.$queryRawUnsafe(`
    SELECT senior_citizen_id
    FROM public.senior_citizen_beneficiaries
    ORDER BY senior_citizen_id
  `);
  console.log('Senior citizens found:', seniors.length);

  const existing = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM public.beneficiary_program_pivots
    WHERE beneficiary_type = 'SENIOR_CITIZEN' AND program_id = '${PROGRAM_ID}'
  `);
  console.log('Existing SENIOR_CITIZEN pivots:', existing[0]?.cnt);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < seniors.length; i += BATCH_SIZE) {
    const batch = seniors.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(seniors.length / BATCH_SIZE);

    // Build VALUES using gen_random_uuid() — no UUID params needed
    const rows = batch.map(s => {
      // Escape single quotes in senior_citizen_id (only user-supplied field)
      const safeId = String(s.senior_citizen_id).replace(/'/g, "''");
      return `  (gen_random_uuid(), 'SENIOR_CITIZEN', '${safeId}', '${PROGRAM_ID}', 'active', NOW())`;
    });

    const sql = `INSERT INTO public.beneficiary_program_pivots
  (id, beneficiary_type, beneficiary_id, program_id, status, created_at)
VALUES
${rows.join(',\n')}
ON CONFLICT (beneficiary_type, beneficiary_id, program_id) DO NOTHING`;

    try {
      await prisma.$executeRawUnsafe(sql);
      inserted += batch.length;
      console.log(`  Batch ${batchNum}/${totalBatches} OK  (${inserted} inserted so far)`);
    } catch (err) {
      console.error(`  Batch ${batchNum}/${totalBatches} ERR:`, err.message);
      console.error('  SQL (first 200 chars):', sql.substring(0, 200));
      skipped += batch.length;
    }
  }

  const final = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM public.beneficiary_program_pivots
    WHERE beneficiary_type = 'SENIOR_CITIZEN' AND program_id = '${PROGRAM_ID}'
  `);

  console.log('\n' + '-'.repeat(50));
  console.log('Done. SENIOR_CITIZEN pivots now:', final[0]?.cnt);
  console.log('Skipped (errors):', skipped);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
