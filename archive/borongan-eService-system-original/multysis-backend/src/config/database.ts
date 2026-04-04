import { PrismaClient } from '@prisma/client';
import { addDevLog } from '../services/dev.service';

const prismaClientSingleton = () => {
  const isDebugDb = process.env.DEBUG_DB === 'true';
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development' && isDebugDb
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  });

  // Log Prisma connection errors
  prisma.$connect().catch((error: any) => {
    addDevLog('error', 'Prisma database connection failed', {
      error: error.message || 'Unknown Prisma connection error',
    });
  });

  return prisma;
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
