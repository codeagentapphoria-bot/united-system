/**
 * fix-senior-resident-ids.js
 *
 * Batch-updates senior citizen resident_id from RES-XXXX to BRGN-2026-000XXXX.
 * Uses a CASE WHEN bulk UPDATE — single query, no per-row round trips.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function main() {
  // 1. Find all SC residents with wrong RES- IDs, ordered by resident_id
  const badResidents = await prisma.$queryRawUnsafe(`
    SELECT r.id, r.resident_id as old_resident_id
    FROM public.residents r
    JOIN public.senior_citizen_beneficiaries sc ON sc.resident_id = r.id
    WHERE r.resident_id LIKE 'RES-%'
    ORDER BY r.resident_id
  `);

  if (badResidents.length === 0) {
    console.log('No RES- prefixed senior resident IDs found. Nothing to fix.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${badResidents.length} senior residents with wrong RES- IDs`);

  // 2. We know 477 were fixed in the partial run (BRGN-2026-0004194 to BRGN-2026-0004670)
  // So the actual max in DB is 4670. Start from there.
  const KNOWN_MAX = 4670;
  const now = new Date().toISOString().replace(/'/g, "''");

  // 3. Build CASE WHEN assignments keyed by old RES- ID
  const assignments = badResidents.map((row, idx) => {
    const safeOld = String(row.old_resident_id).replace(/'/g, "''");
    const newNum = KNOWN_MAX + 1 + idx;
    const newId = `BRGN-2026-${String(newNum).padStart(7, '0')}`;
    const safeNew = newId.replace(/'/g, "''");
    return `WHEN resident_id = '${safeOld}' THEN '${safeNew}'`;
  });

  // 4. Single bulk UPDATE — no counter needed, no conflicts
  const updateSql = `
    UPDATE public.residents
    SET resident_id = CASE ${assignments.join(' ')} END,
        updated_at = '${now}'
    WHERE resident_id LIKE 'RES-%'
  `;

  const result = await prisma.$executeRawUnsafe(updateSql);
  console.log(`Updated ${result} resident IDs`);
  console.log(`New IDs range: BRGN-2026-${String(KNOWN_MAX + 1).padStart(7, '0')} to BRGN-2026-${String(KNOWN_MAX + badResidents.length).padStart(7, '0')}`);

  // 5. Advance counter
  await prisma.$executeRawUnsafe(`
    UPDATE public.resident_counters
    SET counter = ${currentCounter}, updated_at = '${now.replace(/''/g, "'")}'
    WHERE municipality_id = 2 AND year = 2026
  `);
  console.log(`Counter advanced to: ${currentCounter}`);

  // 6. Verify
  const sample = await prisma.$queryRawUnsafe(`
    SELECT r.resident_id, r.first_name, r.last_name
    FROM public.residents r
    JOIN public.senior_citizen_beneficiaries sc ON sc.resident_id = r.id
    WHERE r.resident_id LIKE 'BRGN-%'
    ORDER BY r.resident_id
    LIMIT 5
  `);
  console.log('\nSample fixed IDs:');
  sample.forEach(s => console.log(' ', s.resident_id, s.first_name, s.last_name));

  const remaining = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM public.residents r
    JOIN public.senior_citizen_beneficiaries sc ON sc.resident_id = r.id
    WHERE r.resident_id LIKE 'RES-%'
  `);
  console.log('\nRemaining RES- IDs:', remaining[0]?.cnt);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
