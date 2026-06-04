require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

(async () => {
  const total = await prisma.seniorCitizenBeneficiary.count();
  const first = await prisma.$queryRawUnsafe("SELECT senior_citizen_id FROM public.senior_citizen_beneficiaries ORDER BY senior_citizen_id ASC LIMIT 1");
  const last = await prisma.$queryRawUnsafe("SELECT senior_citizen_id FROM public.senior_citizen_beneficiaries ORDER BY senior_citizen_id DESC LIMIT 1");
  const byStatus = await prisma.$queryRawUnsafe("SELECT status, COUNT(*) as cnt FROM public.senior_citizen_beneficiaries GROUP BY status");
  console.log('Total senior citizens:', total);
  console.log('First SC ID:', first[0]?.senior_citizen_id);
  console.log('Last SC ID:', last[0]?.senior_citizen_id);
  console.log('By status:');
  for (const r of byStatus) console.log('  ' + r.status + ': ' + r.cnt);
  await prisma.$disconnect();
})();
