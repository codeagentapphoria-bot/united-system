/**
 * enroll-sc-libre-sakay-gpa.js
 *
 * Inserts government_program_applications for Libre Sakay (gp-all-libre-sakay)
 * for all 2,593 senior citizens.
 *
 * Missing piece: seniors have pivot entries for Libre Sakay but no application
 * record in government_program_applications. The Libre Sakay beneficiaries list
 * queries government_program_applications filtered by status='approved' — seniors
 * don't appear without this.
 *
 * No unique constraint on (resident_id, program_id), so no ON CONFLICT needed.
 * seniors have 0 Libre Sakay applications currently — safe to insert.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

const LIBRE_SAKAY_PROGRAM_ID = 'gp-all-libre-sakay';
const BATCH_SIZE = 50;

async function main() {
  const prog = await prisma.governmentProgram.findUnique({ where: { id: LIBRE_SAKAY_PROGRAM_ID } });
  if (!prog) { console.error('Libre Sakay program not found:', LIBRE_SAKAY_PROGRAM_ID); process.exit(1); }
  console.log('Program:', prog.name, '(' + LIBRE_SAKAY_PROGRAM_ID + ')');

  const seniors = await prisma.$queryRawUnsafe(`
    SELECT resident_id
    FROM public.senior_citizen_beneficiaries
    ORDER BY senior_citizen_id
  `);
  console.log('Senior citizens found:', seniors.length);

  const existing = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM public.government_program_applications
    WHERE program_id = '${LIBRE_SAKAY_PROGRAM_ID}'
    AND resident_id IN (SELECT resident_id FROM senior_citizen_beneficiaries)
  `);
  console.log('Existing Libre Sakay applications for seniors:', existing[0]?.cnt);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < seniors.length; i += BATCH_SIZE) {
    const batch = seniors.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(seniors.length / BATCH_SIZE);

    const rows = batch.map(s => {
      const uuid = require('crypto').randomUUID();
      const now = new Date().toISOString().replace(/'/g, "''");
      // resident_id is the UUID from residents.id
      const safeResId = String(s.resident_id).replace(/'/g, "''");
      return `  ('${uuid}', '${safeResId}', '${LIBRE_SAKAY_PROGRAM_ID}', 'approved', NULL, NULL, NULL, '${now}', '${now}', NULL)`;
    });

    const sql = `INSERT INTO public.government_program_applications
  (id, resident_id, program_id, status, admin_notes, submitted_data, attachments, applied_at, reviewed_at, reviewed_by)
VALUES
${rows.join(',\n')}`;

    try {
      await prisma.$executeRawUnsafe(sql);
      inserted += batch.length;
      console.log(`  Batch ${batchNum}/${totalBatches} OK  (${inserted} inserted so far)`);
    } catch (err) {
      console.error(`  Batch ${batchNum}/${totalBatches} ERR:`, err.message);
      skipped += batch.length;
    }
  }

  const final = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM public.government_program_applications
    WHERE program_id = '${LIBRE_SAKAY_PROGRAM_ID}'
    AND resident_id IN (SELECT resident_id FROM senior_citizen_beneficiaries)
  `);

  console.log('\n' + '-'.repeat(50));
  console.log('Done. Libre Sakay applications for seniors:', final[0]?.cnt);
  console.log('Skipped (errors):', skipped);

  // Total Libre Sakay applications
  const total = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM government_program_applications
    WHERE program_id = '${LIBRE_SAKAY_PROGRAM_ID}'
  `);
  console.log('Total Libre Sakay applications:', total[0]?.cnt);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
