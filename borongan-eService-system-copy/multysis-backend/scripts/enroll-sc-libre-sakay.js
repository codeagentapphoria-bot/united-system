require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

const LIBRE_SAKAY_ID = 'gp-all-libre-sakay';

async function main() {
  const prog = await prisma.governmentProgram.findUnique({ where: { id: LIBRE_SAKAY_ID } });
  if (!prog) { console.error('Libre Sakay program not found:', LIBRE_SAKAY_ID); process.exit(1); }
  console.log('Program:', prog.name, '(' + LIBRE_SAKAY_ID + ')');

  const seniors = await prisma.$queryRawUnsafe(`
    SELECT senior_citizen_id
    FROM public.senior_citizen_beneficiaries
    ORDER BY senior_citizen_id
  `);
  console.log('Senior citizens found:', seniors.length);

  const existing = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM public.beneficiary_program_pivots
    WHERE beneficiary_type = 'SENIOR_CITIZEN' AND program_id = '${LIBRE_SAKAY_ID}'
  `);
  console.log('Already enrolled in Libre Sakay:', existing[0]?.cnt);

  const BATCH_SIZE = 50;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < seniors.length; i += BATCH_SIZE) {
    const batch = seniors.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(seniors.length / BATCH_SIZE);

    const rows = batch.map(s => {
      const safeId = String(s.senior_citizen_id).replace(/'/g, "''");
      return `  (gen_random_uuid(), 'SENIOR_CITIZEN', '${safeId}', '${LIBRE_SAKAY_ID}', 'active', NOW())`;
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
      skipped += batch.length;
    }
  }

  const final = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM public.beneficiary_program_pivots
    WHERE beneficiary_type = 'SENIOR_CITIZEN' AND program_id = '${LIBRE_SAKAY_ID}'
  `);

  console.log('\n' + '-'.repeat(50));
  console.log('Done. Libre Sakay pivots for seniors:', final[0]?.cnt);
  console.log('Skipped (errors):', skipped);

  // Overall pivot counts
  const total = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM beneficiary_program_pivots`);
  const scPivots = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM beneficiary_program_pivots WHERE beneficiary_type = 'SENIOR_CITIZEN'`);
  console.log('\nTotal pivots:', total[0]?.cnt);
  console.log('SENIOR_CITIZEN pivots:', scPivots[0]?.cnt);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
