import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw<any[]>`
    SELECT status, count(*) as count 
    FROM public.residents 
    GROUP BY status
  `;
  const formatted = result.map(r => ({
    status: r.status,
    count: Number(r.count)
  }));
  console.log(JSON.stringify(formatted, null, 2));
}

main().finally(() => prisma.$disconnect());
