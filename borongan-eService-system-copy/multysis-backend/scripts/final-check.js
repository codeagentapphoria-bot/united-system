require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function main() {
  const students = await prisma.$queryRawUnsafe(`
    SELECT r.resident_id, r.first_name, r.last_name
    FROM student_beneficiaries s
    JOIN residents r ON r.id = s.resident_id
    LIMIT 3
  `);
  const seniors = await prisma.$queryRawUnsafe(`
    SELECT r.resident_id, r.first_name, r.last_name
    FROM senior_citizen_beneficiaries s
    JOIN residents r ON r.id = s.resident_id
    LIMIT 3
  `);

  console.log('=== STUDENT resident_id samples ===');
  students.forEach(s => console.log(' ', s.resident_id, s.first_name, s.last_name));

  console.log('\n=== SENIOR CITIZEN resident_id samples ===');
  seniors.forEach(s => console.log(' ', s.resident_id, s.first_name, s.last_name));

  console.log('\n=== All 4 tables ===');
  const sc = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM senior_citizen_beneficiaries`);
  const rc = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM resident_classifications`);
  const gpa = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM government_program_applications WHERE program_id = '00000501-0501-4001-8001-000000000004'`);
  const pivots = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM beneficiary_program_pivots WHERE beneficiary_type = 'SENIOR_CITIZEN'`);
  const allPivots = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM beneficiary_program_pivots`);

  console.log('senior_citizen_beneficiaries  :', sc[0].cnt);
  console.log('resident_classifications       :', rc[0].cnt);
  console.log('government_program_applications :', gpa[0].cnt);
  console.log('beneficiary_program_pivots (SC):', pivots[0].cnt);
  console.log('Total pivots                   :', allPivots[0].cnt);

  const match = (sc[0].cnt === rc[0].cnt && rc[0].cnt === gpa[0].cnt && gpa[0].cnt === pivots[0].cnt);
  console.log('\nAll 4 tables match:', match ? 'YES' : 'NO');

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
