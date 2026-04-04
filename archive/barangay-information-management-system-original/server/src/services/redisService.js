import { redis, cacheUtils } from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Redis Service
 * Provides session management, rate limiting, and other Redis-based functionality
 */
class RedisService {
  /**
   * Session Management
   */
  
  // Store user session
  async storeSession(sessionId, userData, ttl = 86400) {
    try {
      const key = `session:${sessionId}`;
      await cacheUtils.set(key, userData, ttl);
      logger.info(`Session stored: ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Store session error:', error);
      return false;
    }
  }

  // Get user session
  async getSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      const session = await cacheUtils.get(key);
      return session;
    } catch (error) {
      logger.error('Get session error:', error);
      return null;
    }
  }

  // Delete user session
  async deleteSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      await cacheUtils.del(key);
      logger.info(`Session deleted: ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Delete session error:', error);
      return false;
    }
  }

  // Extend session TTL
  async extendSession(sessionId, ttl = 86400) {
    try {
      const key = `session:${sessionId}`;
      const session = await this.getSession(sessionId);
      if (session) {
        await cacheUtils.set(key, session, ttl);
        logger.info(`Session extended: ${sessionId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Extend session error:', error);
      return false;
    }
  }

  /**
   * Rate Limiting
   */
  
  // Check rate limit
  async checkRateLimit(identifier, maxRequests = 100, windowMs = 900000) {
    try {
      const key = `ratelimit:${identifier}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.floor(windowMs / 1000));
      }
      
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = await redis.ttl(key);
      
      return {
        current,
        remaining,
        resetTime,
        limit: maxRequests,
        isAllowed: current <= maxRequests
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      return {
        current: 0,
        remaining: maxRequests,
        resetTime: 0,
        limit: maxRequests,
        isAllowed: true
      };
    }
  }

  // Reset rate limit
  async resetRateLimit(identifier) {
    try {
      const key = `ratelimit:${identifier}`;
      await cacheUtils.del(key);
      logger.info(`Rate limit reset: ${identifier}`);
      return true;
    } catch (error) {
      logger.error('Reset rate limit error:', error);
      return false;
    }
  }

  /**
   * Token Management
   */
  
  // Store refresh token
  async storeRefreshToken(userId, token, ttl = 604800) {
    try {
      const key = `refresh_token:${userId}`;
      await cacheUtils.set(key, token, ttl);
      logger.info(`Refresh token stored for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Store refresh token error:', error);
      return false;
    }
  }

  // Get refresh token
  async getRefreshToken(userId) {
    try {
      const key = `refresh_token:${userId}`;
      return await cacheUtils.get(key);
    } catch (error) {
      logger.error('Get refresh token error:', error);
      return null;
    }
  }

  // Delete refresh token
  async deleteRefreshToken(userId) {
    try {
      const key = `refresh_token:${userId}`;
      await cacheUtils.del(key);
      logger.info(`Refresh token deleted for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Delete refresh token error:', error);
      return false;
    }
  }

  /**
   * Cache Management
   */
  
  // Cache user data
  async cacheUserData(userId, userData, ttl = 3600) {
    try {
      const key = `user:${userId}`;
      await cacheUtils.set(key, userData, ttl);
      logger.info(`User data cached: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Cache user data error:', error);
      return false;
    }
  }

  // Get cached user data
  async getCachedUserData(userId) {
    try {
      const key = `user:${userId}`;
      return await cacheUtils.get(key);
    } catch (error) {
      logger.error('Get cached user data error:', error);
      return null;
    }
  }

  // Invalidate user cache
  async invalidateUserCache(userId) {
    try {
      const key = `user:${userId}`;
      await cacheUtils.del(key);
      logger.info(`User cache invalidated: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Invalidate user cache error:', error);
      return false;
    }
  }

  /**
   * Notification System
   */
  
  // Store notification
  async storeNotification(userId, notification, ttl = 2592000) {
    try {
      const key = `notification:${userId}:${Date.now()}`;
      await cacheUtils.set(key, notification, ttl);
      logger.info(`Notification stored for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Store notification error:', error);
      return false;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 50) {
    try {
      const pattern = `notification:${userId}:*`;
      const keys = await redis.keys(pattern);
      const sortedKeys = keys.sort().reverse().slice(0, limit);
      
      if (sortedKeys.length === 0) return [];
      
      const notifications = await cacheUtils.mget(sortedKeys);
      return notifications.filter(n => n !== null);
    } catch (error) {
      logger.error('Get user notifications error:', error);
      return [];
    }
  }

  /**
   * Analytics and Monitoring
   */
  
  // Track API usage
  async trackApiUsage(endpoint, userId = null, responseTime = 0) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const key = `api_usage:${endpoint}:${timestamp}`;
      
      const usage = {
        endpoint,
        userId,
        responseTime,
        timestamp,
        count: 1
      };
      
      const existing = await cacheUtils.get(key);
      if (existing) {
        usage.count = existing.count + 1;
        usage.responseTime = (existing.responseTime + responseTime) / 2;
      }
      
      await cacheUtils.set(key, usage, 86400); // Keep for 24 hours
      return true;
    } catch (error) {
      logger.error('Track API usage error:', error);
      return false;
    }
  }

  // Get API usage statistics
  async getApiUsageStats(endpoint, hours = 24) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now - (hours * 3600);
      const pattern = `api_usage:${endpoint}:*`;
      
      const keys = await redis.keys(pattern);
      const relevantKeys = keys.filter(key => {
        const timestamp = parseInt(key.split(':').pop());
        return timestamp >= startTime;
      });
      
      if (relevantKeys.length === 0) return { total: 0, avgResponseTime: 0 };
      
      const usages = await cacheUtils.mget(relevantKeys);
      const validUsages = usages.filter(u => u !== null);
      
      const total = validUsages.reduce((sum, usage) => sum + usage.count, 0);
      const avgResponseTime = validUsages.reduce((sum, usage) => sum + usage.responseTime, 0) / validUsages.length;
      
      return { total, avgResponseTime: Math.round(avgResponseTime) };
    } catch (error) {
      logger.error('Get API usage stats error:', error);
      return { total: 0, avgResponseTime: 0 };
    }
  }

  /**
   * Utility Methods
   */
  
  // Get Redis info
  async getInfo() {
    try {
      const info = await redis.info();
      const keys = await redis.dbsize();
      return { info, keys };
    } catch (error) {
      logger.error('Get Redis info error:', error);
      return null;
    }
  }

  // Clear all data
  async clearAll() {
    try {
      await cacheUtils.flushAll();
      logger.info('All Redis data cleared');
      return true;
    } catch (error) {
      logger.error('Clear all data error:', error);
      return false;
    }
  }

  // Health check
  async healthCheck() {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Additional Redis Operations
   */
  
  // Increment a key value
  async incr(key) {
    try {
      const result = await redis.incr(key);
      return result;
    } catch (error) {
      logger.error('Redis incr error:', error);
      return 0;
    }
  }

  // Set expiration for a key
  async expire(key, seconds) {
    try {
      // First check if key exists
      const exists = await redis.exists(key);
      if (!exists) {
        logger.warn(`Cannot set expiration for non-existent key: ${key}`);
        return false;
      }
      
      const result = await redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Redis expire error:', error);
      return false;
    }
  }
}

export default new RedisService(); 