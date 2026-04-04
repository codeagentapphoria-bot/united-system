import { PrismaClient } from '@prisma/client';
import { addDevLog } from '../services/dev.service';

const SLOW_QUERY_THRESHOLD_MS = 1000;

const prismaClientSingleton = () => {
  const isDebugDb = process.env.DEBUG_DB === 'true';
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development' && isDebugDb
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  });

  if (process.env.NODE_ENV === 'development') {
    (prisma as any).$on('query', (e: any) => {
      if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        const queryPreview = e.query.slice(0, 150);
        console.warn(
          `[PERF] SLOW QUERY (${e.duration}ms): ${queryPreview}${e.query.length > 150 ? '...' : ''}`
        );
        addDevLog('warn', 'Slow database query detected', {
          duration: e.duration,
          query: queryPreview,
        });
      }
    });
  }

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
