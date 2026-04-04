import { Request, Response, NextFunction } from 'express';

const SLOW_REQUEST_MS = 3000;
const SLOW_QUERY_MS = 1000;

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (duration > SLOW_REQUEST_MS) {
      console.warn(
        `[PERF] SLOW ${req.method} ${req.originalUrl} - ${duration}ms`
      );
    }
  });

  next();
};

export const queryLoggingMiddleware = {
  logSlowQuery: (query: string, duration: number) => {
    if (duration > SLOW_QUERY_MS) {
      console.warn(
        `[PERF] SLOW QUERY (${duration}ms): ${query.slice(0, 100)}...`
      );
    }
  },
};

export default performanceMiddleware;