import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('TestPass123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test-admin@local.test' },
    update: { password },
    create: {
      email: 'test-admin@local.test',
      password,
      name: 'Test Admin',
      role: 'admin',
    },
  });
  console.log('Seeded admin:', user.id, user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
