import Redis from 'ioredis';
import { loadEnvConfig } from '../utils/envLoader.js';
import logger from '../utils/logger.js';

// Load environment variables
loadEnvConfig();

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '' ? process.env.REDIS_PASSWORD : undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnClusterDown: 300,
  enableReadyCheck: true,
  maxLoadingTimeout: 10000,
  enableOfflineQueue: true,
  showFriendlyErrorStack: process.env.NODE_ENV === 'development'
};

// Create Redis client
const redis = new Redis(redisConfig);

// Redis connection event handlers
redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Test Redis connection
const testRedisConnection = async () => {
  try {
    await redis.ping();
    logger.info('Redis connection test successful');
    return true;
  } catch (error) {
    logger.error('Redis connection test failed:', error);
    return false;
  }
};

// Graceful shutdown
const closeRedisConnection = async () => {
  try {
    await redis.quit();
    logger.info('Redis connection closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

// Cache utility functions
const cacheUtils = {
  // Set cache with TTL
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      await redis.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  },

  // Get cache
  async get(key) {
    try {
      const value = await redis.get(key);
      if (!value) return null;
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  },

  // Delete cache (supports multiple keys)
  async del(...keys) {
    try {
      if (keys.length === 1) {
        await redis.del(keys[0]);
      } else {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  },

  // Get TTL (Time To Live) for a key
  async ttl(key) {
    try {
      const result = await redis.ttl(key);
      return result;
    } catch (error) {
      logger.error('Redis ttl error:', error);
      return -1;
    }
  },

  // Get keys matching a pattern
  async keys(pattern) {
    try {
      const result = await redis.keys(pattern);
      return result;
    } catch (error) {
      logger.error('Redis keys error:', error);
      return [];
    }
  },

  // Set multiple cache entries
  async mset(keyValuePairs, ttl = 3600) {
    try {
      const pipeline = redis.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        pipeline.setex(key, ttl, serializedValue);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Redis mset error:', error);
      return false;
    }
  },

  // Get multiple cache entries
  async mget(keys) {
    try {
      const values = await redis.mget(keys);
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      logger.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  },

  // Clear all cache
  async flushAll() {
    try {
      await redis.flushall();
      logger.info('Redis cache cleared');
      return true;
    } catch (error) {
      logger.error('Redis flushall error:', error);
      return false;
    }
  },

  // Get cache statistics
  async getStats() {
    try {
      const info = await redis.info();
      const keys = await redis.dbsize();
      return { info, keys };
    } catch (error) {
      logger.error('Redis stats error:', error);
      return null;
    }
  }
};

export { redis, testRedisConnection, closeRedisConnection, cacheUtils };
export default redis; 