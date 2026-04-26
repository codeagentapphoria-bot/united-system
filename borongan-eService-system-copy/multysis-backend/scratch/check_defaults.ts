import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT table_name, column_name, column_default 
    FROM information_schema.columns 
    WHERE table_name IN ('senior_citizen_beneficiaries', 'pwd_beneficiaries', 'student_beneficiaries', 'solo_parent_beneficiaries')
      AND column_name = 'id'
  `;
  console.log(JSON.stringify(result, null, 2));
}

main().finally(() => prisma.$disconnect());
