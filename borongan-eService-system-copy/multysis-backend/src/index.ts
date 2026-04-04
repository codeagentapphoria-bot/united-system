import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import type { AuthRequest } from './middleware/auth';
import { addDevLog, startDevDashboardUpdates } from './services/dev.service';
import { setSocketInstance } from './services/socket.service';
import { initializeSocket } from './socket/socket';
import { parseTimeString } from './utils/timeParser';

// Load environment variables
dotenv.config();

// Validate required environment variables
const validateEnvironment = (): void => {
  const errors: string[] = [];

  // Validate JWT_SECRET
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // Validate CORS_ORIGIN — supports comma-separated list of URLs
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5174';
  corsOrigin.split(',').map((o) => o.trim()).filter(Boolean).forEach((origin) => {
    if (!origin.match(/^https?:\/\/.+/)) {
      errors.push(`CORS_ORIGIN entry '${origin}' must be a valid URL`);
    }
  });

  // Validate timeout environment variables
  // Validate ACCESS_TOKEN_EXPIRES (default: 10m, range: 5-15 min)
  const accessTokenExpires = process.env.ACCESS_TOKEN_EXPIRES || '10m';
  try {
    const accessTokenMs = parseTimeString(accessTokenExpires);
    const minMs = 5 * 60 * 1000; // 5 minutes
    const maxMs = 15 * 60 * 1000; // 15 minutes
    if (accessTokenMs < minMs || accessTokenMs > maxMs) {
      errors.push(`ACCESS_TOKEN_EXPIRES must be between 5m and 15m (got: ${accessTokenExpires})`);
    }
  } catch (error: any) {
    errors.push(`ACCESS_TOKEN_EXPIRES format error: ${error.message}`);
  }

  // Validate REFRESH_TOKEN_EXPIRES (default: 30d)
  const refreshTokenExpires = process.env.REFRESH_TOKEN_EXPIRES || '30d';
  try {
    parseTimeString(refreshTokenExpires);
  } catch (error: any) {
    errors.push(`REFRESH_TOKEN_EXPIRES format error: ${error.message}`);
  }

  // Validate IDLE_TIMEOUT (default: 15m)
  const idleTimeout = process.env.IDLE_TIMEOUT || '15m';
  try {
    parseTimeString(idleTimeout);
  } catch (error: any) {
    errors.push(`IDLE_TIMEOUT format error: ${error.message}`);
  }

  // Validate ABSOLUTE_TIMEOUT (default: 6h)
  const absoluteTimeout = process.env.ABSOLUTE_TIMEOUT || '6h';
  try {
    parseTimeString(absoluteTimeout);
  } catch (error: any) {
    errors.push(`ABSOLUTE_TIMEOUT format error: ${error.message}`);
  }

  // Validate COOKIE_SECURE (should be boolean string)
  const cookieSecure = process.env.COOKIE_SECURE;
  if (cookieSecure && cookieSecure !== 'true' && cookieSecure !== 'false') {
    errors.push('COOKIE_SECURE must be "true" or "false"');
  }

  // Validate COOKIE_SAME_SITE (should be strict, lax, or none)
  const cookieSameSite = process.env.COOKIE_SAME_SITE || 'strict';
  if (!['strict', 'lax', 'none'].includes(cookieSameSite.toLowerCase())) {
    errors.push('COOKIE_SAME_SITE must be "strict", "lax", or "none"');
  }

  if (errors.length > 0) {
    console.error('❌ Environment variable validation failed:');
    errors.forEach((error) => console.error(`   - ${error}`));
    console.error(
      '\nPlease check your .env file and ensure all required variables are set correctly.'
    );
    process.exit(1);
  }
};

validateEnvironment();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Supports comma-separated list of allowed origins (BIMS frontend + E-Services frontend)
const _rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5174';
const _allowedOrigins = _rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
const corsOrigin = _allowedOrigins[0]; // for backward-compat usages below
const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${PORT}`;

// Build image sources for CSP - allow same origin, data URIs, and configured origins
const imgSources = ["'self'", 'data:'];
_allowedOrigins.forEach((o) => { if (o !== apiBaseUrl) imgSources.push(o); });
if (apiBaseUrl) {
  imgSources.push(apiBaseUrl);
}

// Build WebSocket sources for CSP - allow WebSocket connections
// Helper function to add HTTP/HTTPS and WebSocket versions of a URL
const addUrlVariants = (url: string, sources: string[]): void => {
  if (!url) return;

  sources.push(url);

  // Add WebSocket version
  if (url.startsWith('http://')) {
    sources.push(url.replace('http://', 'ws://'));
  } else if (url.startsWith('https://')) {
    sources.push(url.replace('https://', 'wss://'));
  }
};

const wsSources: string[] = ["'self'"];

// Add CORS origin and its WebSocket variant (this is the frontend URL)
if (corsOrigin) {
  addUrlVariants(corsOrigin, wsSources);
}

// Add API base URL and its WebSocket variant (this is the backend URL)
if (apiBaseUrl) {
  addUrlVariants(apiBaseUrl, wsSources);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: imgSources,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Note: Consider removing 'unsafe-inline' if frontend doesn't use inline styles
        connectSrc: wsSources,
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
); // Security headers
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow server-to-server / curl
      if (_allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// Rate limiting
// Note: Auth routes have their own rate limiters defined in auth.routes.ts

// Helper function to get user identifier for rate limiting
const getRateLimitKey = (req: Request): string => {
  // Use user ID if authenticated, otherwise use IP
  const authReq = req as AuthRequest;
  return authReq.user?.id || req.ip || 'anonymous';
};

// Helper function to log rate limit hits
const rateLimitHandler = (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userInfo = authReq.user ? `user: ${authReq.user.id}` : `ip: ${req.ip}`;

  console.warn(`⚠️ Rate limit exceeded - ${userInfo} on ${req.method} ${req.originalUrl}`);

  // Log to dev dashboard
  addDevLog('warn', 'Rate limit exceeded', {
    userId: authReq.user?.id,
    userType: authReq.user?.type,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.originalUrl,
    method: req.method,
  });

  res.status(429).json({
    status: 'error',
    message: 'Too many requests, please try again later',
  });
};

// Skip rate limiting in development
const shouldSkipRateLimit = (_req: Request): boolean => {
  return process.env.NODE_ENV !== 'production';
};

// 1. Strict rate limit for authentication endpoints (handled in auth.routes.ts)
// Already configured: 5 requests per 15 minutes

// 2. Rate limit for file uploads (expensive operations)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per window
  message: {
    status: 'error',
    message: 'Too many upload requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  skip: shouldSkipRateLimit,
  handler: rateLimitHandler,
});

// 3. Rate limit for heavy operations (reports, searches, bulk operations)
// Reserved for future use when heavy operation routes are added
// Example: app.use('/api/reports', heavyOperationLimiter, reportRoutes);
// When adding heavy operation routes, uncomment and use: heavyOperationLimiter
const heavyOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    status: 'error',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  skip: shouldSkipRateLimit,
  handler: rateLimitHandler,
});

// Reference to prevent TypeScript unused variable error (reserved for future use)
void heavyOperationLimiter;

// 4. Rate limit for light data fetches (lists, views, normal navigation)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window (increased from 100)
  message: {
    status: 'error',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey, // Per-user rate limiting
  skip: shouldSkipRateLimit, // Skip in development
  handler: rateLimitHandler, // Log when rate limit is hit
});

app.use(compression()); // Compress responses
app.use(morgan('dev')); // HTTP request logger

import performanceMiddleware from './middleware/performance';
app.use(performanceMiddleware); // Log slow requests

// Cache control headers middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  const path = req.path;

  // Static data endpoints - cacheable (5 minutes)
  if (path.startsWith('/api/services') || 
      path.startsWith('/api/faqs') ||
      path.startsWith('/api/public/faqs') ||
      path.startsWith('/api/addresses')) {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  }
  // Dashboard - short cache (30 seconds)
  else if (path.includes('dashboard') || path.includes('statistics')) {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  }
  // User-specific data - no cache
  else {
    res.set('Cache-Control', 'no-store, max-age=0');
  }
  next();
});

// Request timeout middleware (30 seconds)
app.use((req: Request, res: Response, next: NextFunction): void => {
  const timeoutMs = 30000; // 30 seconds
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        status: 'error',
        message: 'Request timeout',
        code: 'TIMEOUT',
      });
    }
  }, timeoutMs);

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
});

app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies with increased limit
app.use(cookieParser()); // Parse cookies

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Multysis API v2',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
    },
  });
});

// Import routes
import addressRoutes from './routes/address.routes';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import portalRegistrationRoutes from './routes/portal-registration.routes';
import portalHouseholdRoutes from './routes/portal-household.routes';
import portalClassificationRoutes from './routes/portal-classification.routes';
import devRoutes from './routes/dev.routes';
import faqRoutes from './routes/faq.routes';
import governmentProgramRoutes from './routes/government-program.routes';
import permissionRoutes from './routes/permission.routes';
import publicFaqRoutes from './routes/public-faq.routes';
import taxProfileRoutes from './routes/tax-profile.routes';
import exemptionRoutes from './routes/exemption.routes';
import paymentRoutes from './routes/payment.routes';
import taxReassessmentRoutes from './routes/tax-reassessment.routes';
import taxPreviewRoutes from './routes/tax-preview.routes';
import roleRoutes from './routes/role.routes';
import residentRoutes from './routes/resident.routes';
import serviceRoutes from './routes/service.routes';
import serviceFieldsRoutes from './routes/service-fields.routes';
// eserviceRoutes removed (AC1) — eservices table dropped; portal uses /api/services/active
import socialAmeliorationSettingRoutes from './routes/social-amelioration-setting.routes';
import socialAmeliorationRoutes from './routes/social-amelioration.routes';
import transactionRoutes from './routes/transaction.routes';
import uploadRoutes from './routes/upload.routes';
import userRoutes from './routes/user.routes';

// Register routes with appropriate rate limiters
// Note: Auth routes apply their own rate limiters (defined in auth.routes.ts)
app.use('/api/auth', authRoutes);

// Dev routes (apply their own rate limiters, defined in dev.routes.ts)
app.use('/api/dev', devRoutes);

// File upload routes (strict limit - expensive operations)
app.use('/api/upload', uploadLimiter, uploadRoutes);

// Light data fetch routes (lenient limit - normal navigation)
app.use('/api/admin', apiLimiter, adminRoutes);
// Address hierarchy (municipalities + barangays from DB — replaces old addresses reference table)
app.use('/api/addresses', apiLimiter, addressRoutes);
// Resident portal registration + BIMS admin review workflow
app.use('/api/portal-registration', apiLimiter, portalRegistrationRoutes);
// Resident portal household self-registration + family management
app.use('/api/portal/household', apiLimiter, portalHouseholdRoutes);
// Resident portal BIMS classification display (read-only)
app.use('/api/portal/classifications', apiLimiter, portalClassificationRoutes);
app.use('/api/transactions', apiLimiter, transactionRoutes);
app.use('/api/roles', apiLimiter, roleRoutes);
app.use('/api/permissions', apiLimiter, permissionRoutes);
app.use('/api/users', apiLimiter, userRoutes);
// Residents — unified person registry (admin CRUD + portal /me)
app.use('/api/residents', apiLimiter, residentRoutes);
app.use('/api/services', apiLimiter, serviceRoutes);
app.use('/api/service-fields', apiLimiter, serviceFieldsRoutes);
// /api/e-services removed (AC1) — portal fetches services via /api/services/active
app.use('/api/government-programs', apiLimiter, governmentProgramRoutes);
app.use('/api/social-amelioration', apiLimiter, socialAmeliorationRoutes);
app.use('/api/social-amelioration-settings', apiLimiter, socialAmeliorationSettingRoutes);
app.use('/api/faqs', apiLimiter, faqRoutes);
app.use('/api/public/faqs', apiLimiter, publicFaqRoutes);
app.use('/api/tax-profiles', apiLimiter, taxProfileRoutes);
app.use('/api/exemptions', apiLimiter, exemptionRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/tax-reassessment', apiLimiter, taxReassessmentRoutes);
app.use('/api/tax', apiLimiter, taxPreviewRoutes);

// Serve uploaded files with CORS headers
app.use(
  '/uploads',
  (_req, res, next) => {
    res.header('Access-Control-Allow-Origin', corsOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  },
  express.static('uploads')
);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path,
  });
});

// Import error handler
import { errorHandler } from './middleware/error';
// Import token cleanup service
import { cleanupExpiredTokens } from './services/refreshToken.service';

// Global error handler (must be last)
app.use(errorHandler);

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);
setSocketInstance(io);
(global as any).io = io;

// Start dev dashboard periodic updates
startDevDashboardUpdates();

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server initialized`);

  // Verify Redis connection on startup
  import('./services/cache.service').then(({ cacheService }) => {
    cacheService.connect().then((connected) => {
      if (connected) {
        console.log(`✅ Redis connected successfully`);
      } else {
        console.warn(`⚠️ Redis connection failed - caching disabled`);
      }
    });
  }).catch((err) => {
    console.warn(`⚠️ Redis import failed:`, err.message);
  });

  // Log server startup
  addDevLog('info', 'Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
  });

  // Schedule automatic cleanup of expired/revoked refresh tokens
  // Run cleanup every 24 hours
  const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Run cleanup immediately on startup
  cleanupExpiredTokens()
    .then((count) => {
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired/revoked refresh tokens on startup`);
      } else {
        console.log(`🧹 No expired/revoked tokens to clean up`);
      }
    })
    .catch((error) => {
      console.error('❌ Error cleaning up tokens on startup:', error);
    });

  // Schedule periodic cleanup
  setInterval(async () => {
    try {
      const count = await cleanupExpiredTokens();
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired/revoked refresh tokens`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up tokens:', error);
    }
  }, CLEANUP_INTERVAL_MS);

  console.log(`🧹 Token cleanup scheduled to run every 24 hours`);

  // Monitor system resources and log warnings
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    };

    // Log warning if memory usage is high (>80% of heap)
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (heapUsagePercent > 80) {
      addDevLog('warn', 'High memory usage detected', {
        heapUsagePercent: Math.round(heapUsagePercent),
        ...memoryUsageMB,
      });
    }
  }, 60000); // Check every minute
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  addDevLog('info', 'Server shutdown initiated (SIGTERM)', {});
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  addDevLog('info', 'Server shutdown initiated (SIGINT)', {});
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
