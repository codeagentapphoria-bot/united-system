import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const programs = await prisma.governmentProgram.findMany({
    select: { id: true, name: true }
  });
  console.log(JSON.stringify(programs, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
