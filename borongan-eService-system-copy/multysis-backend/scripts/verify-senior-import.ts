/**
 * verify-senior-import.ts
 *
 * Queries the database to understand current state before importing
 * the Senior Citizen Registry CSV. Run with:
 *
 *   npx ts-node scripts/verify-senior-import.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const q = <T>(sql: string) => prisma.$queryRawUnsafe<T>(sql);

async function main() {
  console.log('=== Senior Citizen Import — DB Verification ===\n');

  // 1. Government Programs
  console.log('1. Government Programs');
  console.log('─'.repeat(50));
  const programs = await q<Array<{ id: string; name: string; types: string; is_active: boolean }>>(
    "SELECT id, name, types, is_active FROM public.government_programs ORDER BY name"
  );
  if (programs.length === 0) {
    console.log('  No government programs found.');
  } else {
    for (const p of programs) {
      console.log(`  [${p.is_active ? 'ACTIVE' : 'INACTIVE'}] ${p.name} (${p.id})`);
      console.log(`    Types: ${p.types}`);
    }
  }
  console.log();

  // 2. Senior Citizen Beneficiaries
  console.log('2. Senior Citizen Beneficiaries');
  console.log('─'.repeat(50));
  const scCount = await prisma.seniorCitizenBeneficiary.count();
  console.log(`  Total: ${scCount}`);
  if (scCount > 0) {
    const scSamples = await q<Array<{
      id: string; resident_id: string; senior_citizen_id: string; status: string
    }>>(
      "SELECT id, resident_id, senior_citizen_id, status FROM public.senior_citizen_beneficiaries LIMIT 5"
    );
    console.log('  Sample records:');
    for (const s of scSamples) {
      console.log(`    ${s.senior_citizen_id} | ${s.status} | ${s.id.slice(0, 8)}...`);
    }
  }
  console.log();

  // 3. All Beneficiary counts
  console.log('3. All Beneficiary Counts');
  console.log('─'.repeat(50));
  const [pwdCount, studentCount, soloParentCount] = await Promise.all([
    prisma.pWDBeneficiary.count(),
    prisma.studentBeneficiary.count(),
    prisma.soloParentBeneficiary.count(),
  ]);
  console.log(`  Senior Citizens: ${scCount}`);
  console.log(`  PWD:             ${pwdCount}`);
  console.log(`  Students:        ${studentCount}`);
  console.log(`  Solo Parents:    ${soloParentCount}`);
  console.log();

  // 4. Resident Classifications — Senior Citizens
  console.log('4. Resident Classifications — Senior Citizen samples');
  console.log('─'.repeat(50));
  const scClassifications = await q<Array<{
    resident_id: string; classification_type: string; classification_details: unknown
  }>>(
    "SELECT resident_id, classification_type, classification_details FROM public.resident_classifications WHERE classification_type = 'Senior Citizen' LIMIT 5"
  );
  if (scClassifications.length === 0) {
    console.log('  No Senior Citizen classifications found.');
  } else {
    for (const c of scClassifications) {
      console.log(`  resident_id: ${c.resident_id.slice(0, 8)}...`);
      console.log(`  details: ${JSON.stringify(c.classification_details)}`);
    }
  }
  console.log();

  // 5. Resident Counters
  console.log('5. Resident Counters');
  console.log('─'.repeat(50));
  const counters = await q<Array<{
    municipality_id: number; year: number; counter: number; prefix: string
  }>>(
    "SELECT municipality_id, year, counter, prefix FROM public.resident_counters ORDER BY municipality_id, year"
  );
  if (counters.length === 0) {
    console.log('  No counters found.');
  } else {
    for (const c of counters) {
      console.log(`  muni=${c.municipality_id} year=${c.year} counter=${c.counter} prefix=${c.prefix}`);
    }
  }
  console.log();

  // 6. Highest existing beneficiary display IDs
  console.log('6. Highest existing beneficiary display IDs');
  console.log('─'.repeat(50));
  const maxSC = await q<Array<{ max_id: string | null }>>(
    "SELECT MAX(senior_citizen_id) as max_id FROM public.senior_citizen_beneficiaries WHERE senior_citizen_id LIKE 'SC-%'"
  );
  console.log(`  Highest SC ID: ${maxSC[0]?.max_id ?? 'none'}`);

  const maxPWD = await q<Array<{ max_id: string | null }>>(
    "SELECT MAX(pwd_id) as max_id FROM public.pwd_beneficiaries WHERE pwd_id LIKE 'PWD-%'"
  );
  console.log(`  Highest PWD ID: ${maxPWD[0]?.max_id ?? 'none'}`);

  const maxST = await q<Array<{ max_id: string | null }>>(
    "SELECT MAX(student_id) as max_id FROM public.student_beneficiaries WHERE student_id LIKE 'ST-%'"
  );
  console.log(`  Highest ST ID: ${maxST[0]?.max_id ?? 'none'}`);
  console.log();

  // 7. Barangays for municipality 2
  console.log('7. Barangays (municipality_id = 2, Borongan)');
  console.log('─'.repeat(50));
  const barangays = await prisma.barangay.findMany({
    where: { municipalityId: 2 },
    select: { id: true, barangayName: true },
    orderBy: { barangayName: 'asc' },
  });
  console.log(`  Total: ${barangays.length}`);
  for (const b of barangays) {
    console.log(`    id=${b.id} | ${b.barangayName}`);
  }
  console.log();

  // 8. Existing BRGN-2026 residents (for dedup baseline)
  console.log('8. Existing BRGN-2026 residents (dedup baseline)');
  console.log('─'.repeat(50));
  const count2026 = await q<Array<{ cnt: bigint }>>(
    "SELECT COUNT(*) as cnt FROM public.residents WHERE resident_id LIKE 'BRGN-2026-%'"
  );
  console.log(`  Total BRGN-2026: ${count2026[0]?.cnt}`);
  const existing2026 = await q<Array<{
    first_name: string; last_name: string; barangay_id: number; birthdate: string
  }>>(
    "SELECT first_name, last_name, barangay_id, birthdate FROM public.residents WHERE resident_id LIKE 'BRGN-2026-%' LIMIT 5"
  );
  for (const r of existing2026) {
    console.log(`    ${r.first_name} ${r.last_name} | barangay_id=${r.barangay_id} | ${r.birthdate}`);
  }
  console.log();

  // 9. Municipalities
  console.log('9. Municipalities');
  console.log('─'.repeat(50));
  const municipalities = await prisma.municipality.findMany({
    select: { id: true, municipalityName: true, municipalityCode: true },
    orderBy: { id: 'asc' },
  });
  for (const m of municipalities) {
    console.log(`  id=${m.id} | ${m.municipalityName} (${m.municipalityCode})`);
  }
  console.log();

  // 10. Resident Classifications — all types
  console.log('10. Resident Classifications — all types');
  console.log('─'.repeat(50));
  const classCounts = await q<Array<{ classification_type: string; cnt: bigint }>>(
    "SELECT classification_type, COUNT(*) as cnt FROM public.resident_classifications GROUP BY classification_type ORDER BY cnt DESC"
  );
  for (const c of classCounts) {
    console.log(`  ${c.classification_type}: ${c.cnt}`);
  }
  console.log();

  // 11. OSCA data in Senior Citizen classifications
  console.log('11. OSCA IDs in Senior Citizen classifications');
  console.log('─'.repeat(50));
  const oscaCheck = await q<Array<{ resident_id: string; details: unknown }>>(
    "SELECT resident_id, classification_details FROM public.resident_classifications WHERE classification_type = 'Senior Citizen' AND classification_details::text ILIKE '%osca%' LIMIT 5"
  );
  console.log(`  Records with OSCA data: ${oscaCheck.length}`);
  if (oscaCheck.length > 0) {
    for (const r of oscaCheck) {
      console.log(`    ${JSON.stringify(r.details)}`);
    }
  }
  console.log();

  console.log('✅ Verification complete.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
