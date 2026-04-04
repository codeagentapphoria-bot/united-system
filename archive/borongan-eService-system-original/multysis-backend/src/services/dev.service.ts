import prisma from '../config/database';
import { generateRefreshToken, generateToken, TokenPayload } from '../utils/jwt';
import { comparePassword } from '../utils/password';
import {
  emitDevDatabaseInfoUpdate,
  emitDevLogUpdate,
  emitDevSystemInfoUpdate,
} from './socket.service';

export interface DevLoginData {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const devLogin = async (data: DevLoginData) => {
  // Get dev credentials from environment variables
  const devEmail = process.env.DEV_EMAIL;
  const devPasswordHash = process.env.DEV_PASSWORD; // This should be a hashed password

  if (!devEmail || !devPasswordHash) {
    throw new Error('Developer access is not configured');
  }

  // Verify credentials against environment variables
  if (data.email !== devEmail) {
    throw new Error('Invalid credentials');
  }

  // Compare provided password with hashed password from env
  const isPasswordValid = await comparePassword(data.password, devPasswordHash);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const tokenPayload: TokenPayload = {
    id: 'dev-user', // Special ID for dev user
    email: devEmail,
    role: 'developer',
    type: 'dev',
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Note: We don't store refresh tokens for dev users in the database
  // Dev sessions are simpler and don't require refresh token management

  return {
    user: {
      id: 'dev-user',
      email: devEmail,
      name: 'Developer',
      role: 'developer',
    },
    token,
    refreshToken,
  };
};

// Get system logs from buffer
export const getSystemLogs = async (limit: number = 100) => {
  // Return logs from buffer, sorted by timestamp (newest first)
  const sortedLogs = [...logBuffer].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Newest first
  });

  const limitedLogs = sortedLogs.slice(0, limit);

  return {
    logs: limitedLogs,
    total: logBuffer.length,
    limit,
  };
};

// Get database connection info
export const getDatabaseInfo = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    // Get connection pool info (Prisma doesn't expose detailed pool stats directly)
    // We can at least verify connection status
    return {
      connected: true,
      provider: 'postgresql',
      // Prisma doesn't expose pool size directly, but we know it's connected
      poolSize: 'N/A',
      activeConnections: 'N/A',
      message: 'Database connection is active',
    };
  } catch (error: any) {
    // Log database connection error
    addDevLog('error', 'Database connection failed', {
      provider: 'postgresql',
      error: error.message || 'Database connection failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    return {
      connected: false,
      provider: 'postgresql',
      poolSize: 'N/A',
      activeConnections: 'N/A',
      error: error.message || 'Database connection failed',
    };
  }
};

// Get system information
export const getSystemInfo = async () => {
  const memoryUsage = process.memoryUsage();

  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
    },
    env: process.env.NODE_ENV || 'development',
    pid: process.pid,
    cwd: process.cwd(),
  };
};

// Periodic update intervals
let systemInfoInterval: NodeJS.Timeout | null = null;
let databaseInfoInterval: NodeJS.Timeout | null = null;
let logBatchInterval: NodeJS.Timeout | null = null;
let logBuffer: Array<{
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}> = [];
let logIdCounter = 0;
const MAX_LOG_BUFFER_SIZE = 1000; // Keep last 1000 logs in memory

// Start periodic updates for dev dashboard
export const startDevDashboardUpdates = (): void => {
  // System info updates every 8 seconds
  systemInfoInterval = setInterval(async () => {
    try {
      const systemInfo = await getSystemInfo();
      emitDevSystemInfoUpdate(systemInfo);
    } catch (error) {
      console.error('Error emitting system info update:', error);
    }
  }, 8000);

  // Database info updates every 12 seconds
  databaseInfoInterval = setInterval(async () => {
    try {
      const databaseInfo = await getDatabaseInfo();
      emitDevDatabaseInfoUpdate(databaseInfo);
    } catch (error) {
      console.error('Error emitting database info update:', error);
    }
  }, 12000);

  // Log batching - collect logs and emit every 3 seconds
  logBatchInterval = setInterval(() => {
    if (logBuffer.length > 0) {
      logBuffer.forEach((log) => {
        emitDevLogUpdate(log);
      });
      logBuffer = [];
    }
  }, 3000);

  console.log('✅ Dev dashboard periodic updates started');
};

// Stop periodic updates
export const stopDevDashboardUpdates = (): void => {
  if (systemInfoInterval) {
    clearInterval(systemInfoInterval);
    systemInfoInterval = null;
  }
  if (databaseInfoInterval) {
    clearInterval(databaseInfoInterval);
    databaseInfoInterval = null;
  }
  if (logBatchInterval) {
    clearInterval(logBatchInterval);
    logBatchInterval = null;
  }
  logBuffer = [];
  console.log('🛑 Dev dashboard periodic updates stopped');
};

// Add log entry to buffer (can be called from logging middleware or other services)
export const addDevLog = (
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  metadata?: Record<string, any>
): void => {
  logIdCounter += 1;
  const logEntry = {
    id: `log-${Date.now()}-${logIdCounter}`,
    level,
    message,
    timestamp: new Date().toISOString(),
    metadata,
  };

  logBuffer.push(logEntry);

  // Keep buffer size manageable - remove oldest logs if exceeding limit
  if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
    // Remove oldest logs (keep last MAX_LOG_BUFFER_SIZE)
    logBuffer = logBuffer.slice(-MAX_LOG_BUFFER_SIZE);
  }
};
