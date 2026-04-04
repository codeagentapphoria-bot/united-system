import { cacheUtils } from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Redis Cache Middleware
 * Caches API responses to improve performance
 */
export const redisCache = (ttl = 3600, keyPrefix = 'api:') => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if explicitly disabled
    if (req.headers['x-skip-cache'] === 'true') {
      return next();
    }

    try {
      // Generate cache key based on URL and query parameters
      const cacheKey = `${keyPrefix}${req.originalUrl}`;
      
      // Try to get cached response
      const cachedResponse = await cacheUtils.get(cacheKey);
      
      if (cachedResponse) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      // Store original send method
      const originalSend = res.json;
      
      // Override send method to cache the response
      res.json = function(data) {
        // Cache the response
        cacheUtils.set(cacheKey, data, ttl)
          .then(() => {
            logger.info(`Cached response for key: ${cacheKey} with TTL: ${ttl}s`);
          })
          .catch(error => {
            logger.error(`Failed to cache response for key: ${cacheKey}`, error);
          });
        
        // Call original send method
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Redis cache middleware error:', error);
      next();
    }
  };
};

/**
 * Enhanced Cache Invalidation Middleware
 * Automatically detects and invalidates related cache patterns
 */
export const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Store original methods
    const originalSend = res.json;
    const originalStatus = res.status;
    
    // Function to automatically detect cache patterns based on route
    const getAutoCachePatterns = (req) => {
      const route = req.route?.path || req.path;
      const method = req.method;
      const patterns = [];
      
      // Base patterns for common entities
      const entityPatterns = {
        '/resident': ['residents:*', 'resident:*', 'api:*/list/residents*', 'api:*/statistics*'],
        '/residents': ['residents:*', 'resident:*', 'api:*/list/residents*', 'api:*/statistics*'],
        '/household': ['household:*', 'households:*', 'api:*/list/household*', 'api:*/statistics*'],
        '/barangay': ['barangays:*', 'barangay:*', 'api:*/list/barangay*', 'api:*/statistics*'],
        '/user': ['users:*', 'user:*', 'api:*/list/user*', 'api:*/target/*/users*'],
        '/pets': ['pets:*', 'pet:*', 'api:*/list/pets*'],
        '/inventory': ['inventory:*', 'inventories:*', 'api:*/list/inventories*'],
        '/archives': ['archives:*', 'archive:*', 'api:*/list/archives*'],
        '/vaccine': ['vaccine:*', 'vaccines:*', 'api:*/list/vaccine*'],
        '/classification': ['classification:*', 'classifications:*', 'api:*/list/classification*']
      };
      
      // Add patterns based on route
      for (const [routePattern, cachePatterns] of Object.entries(entityPatterns)) {
        if (route.includes(routePattern)) {
          patterns.push(...cachePatterns);
        }
      }
      
      // Add general API patterns for any CRUD operation
      if (method !== 'GET') {
        patterns.push('api:*/list/*', 'api:*/statistics/*');
      }
      
      return [...new Set(patterns)]; // Remove duplicates
    };
    
    // Function to invalidate cache
    const invalidateCachePatterns = async () => {
      try {
        // Get both manual and auto-detected patterns
        const manualPatterns = patterns || [];
        const autoPatterns = getAutoCachePatterns(req);
        const allPatterns = [...new Set([...manualPatterns, ...autoPatterns])];
        
        logger.info(`🔄 Starting cache invalidation for patterns: ${allPatterns.join(', ')}`);

        // Invalidate cache patterns
        for (const pattern of allPatterns) {
          if (pattern.includes('*')) {
            // Handle wildcard patterns
            const keysToDelete = await cacheUtils.keys(pattern);
            logger.info(`🔍 Pattern ${pattern} found ${keysToDelete.length} keys: ${keysToDelete.slice(0, 5).join(', ')}${keysToDelete.length > 5 ? '...' : ''}`);

            if (keysToDelete.length > 0) {
              await cacheUtils.del(...keysToDelete);
              logger.info(`✅ Invalidated cache pattern: ${pattern} (${keysToDelete.length} keys)`);
            } else {
              logger.info(`ℹ️ No cache keys found for pattern: ${pattern}`);
            }
          } else {
            // Handle exact key patterns
            await cacheUtils.del(pattern);
            logger.info(`✅ Invalidated cache key: ${pattern}`);
          }
        }

        logger.info(`🎯 Cache invalidation completed for patterns: ${allPatterns.join(', ')}`);
      } catch (error) {
        logger.error('❌ Cache invalidation error:', error);
      }
    };
    
    // Override send method to invalidate cache after response (success or error)
    res.json = async function(data) {
      // Invalidate cache after successful response
      await invalidateCachePatterns();
      
      // Call original send method
      return originalSend.call(this, data);
    };
    
    // Override status method to invalidate cache on error responses too
    res.status = function(code) {
      // If this is an error status, invalidate cache
      if (code >= 400) {
        invalidateCachePatterns().catch(error => {
          logger.error('Cache invalidation error on status:', error);
        });
      }
      
      // Call original status method
      return originalStatus.call(this, code);
    };

    next();
  };
};

/**
 * Selective Cache Middleware
 * Only caches specific routes or conditions
 */
export const selectiveCache = (options = {}) => {
  const {
    routes = [],
    ttl = 3600,
    keyPrefix = 'api:',
    condition = () => true
  } = options;

  return async (req, res, next) => {
    // Check if route should be cached
    const shouldCache = routes.some(route => 
      req.path.startsWith(route) || req.path === route
    ) && condition(req);

    if (!shouldCache) {
      return next();
    }

    return redisCache(ttl, keyPrefix)(req, res, next);
  };
};

/**
 * Cache Statistics Middleware
 * Returns cache statistics
 */
export const cacheStats = async (req, res) => {
  try {
    const stats = await cacheUtils.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics'
    });
  }
};

/**
 * Auto Cache Invalidation Middleware
 * Automatically invalidates cache for any CRUD operation
 * Usage: router.post('/residents', autoInvalidateCache, createResident);
 */
export const autoInvalidateCache = (req, res, next) => {
  // Apply automatic cache invalidation
  return invalidateCache()(req, res, next);
};

/**
 * Smart Cache Invalidation Middleware
 * Only invalidates cache on successful operations (2xx status codes)
 */
export const smartInvalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    const originalSend = res.json;
    const originalStatus = res.status;
    let responseStatus = 200;
    
    // Function to automatically detect cache patterns based on route
    const getAutoCachePatterns = (req) => {
      const route = req.route?.path || req.path;
      const method = req.method;
      const patterns = [];
      
      // Base patterns for common entities
      const entityPatterns = {
        '/resident': ['residents:*', 'resident:*', 'api:*/list/residents*', 'api:*/statistics*'],
        '/residents': ['residents:*', 'resident:*', 'api:*/list/residents*', 'api:*/statistics*'],
        '/household': ['household:*', 'households:*', 'api:*/list/household*', 'api:*/statistics*'],
        '/barangay': ['barangays:*', 'barangay:*', 'api:*/list/barangay*', 'api:*/statistics*'],
        '/user': ['users:*', 'user:*', 'api:*/list/user*', 'api:*/target/*/users*'],
        '/pets': ['pets:*', 'pet:*', 'api:*/list/pets*'],
        '/inventory': ['inventory:*', 'inventories:*', 'api:*/list/inventories*'],
        '/archives': ['archives:*', 'archive:*', 'api:*/list/archives*'],
        '/vaccine': ['vaccine:*', 'vaccines:*', 'api:*/list/vaccine*'],
        '/classification': ['classification:*', 'classifications:*', 'api:*/list/classification*']
      };
      
      // Add patterns based on route
      for (const [routePattern, cachePatterns] of Object.entries(entityPatterns)) {
        if (route.includes(routePattern)) {
          patterns.push(...cachePatterns);
        }
      }
      
      // Add general API patterns for any CRUD operation
      if (method !== 'GET') {
        patterns.push('api:*/list/*', 'api:*/statistics/*');
      }
      
      return [...new Set(patterns)]; // Remove duplicates
    };
    
    // Track response status
    res.status = function(code) {
      responseStatus = code;
      return originalStatus.call(this, code);
    };
    
    // Override send method to invalidate cache only on success
    res.json = async function(data) {
      // Only invalidate cache on successful responses (2xx)
      if (responseStatus >= 200 && responseStatus < 300) {
        try {
          const autoPatterns = getAutoCachePatterns(req);
          const allPatterns = [...new Set([...patterns, ...autoPatterns])];
          
          logger.info(`🔄 Smart cache invalidation for successful operation: ${allPatterns.join(', ')}`);
          
          for (const pattern of allPatterns) {
            if (pattern.includes('*')) {
              const keysToDelete = await cacheUtils.keys(pattern);
              if (keysToDelete.length > 0) {
                await cacheUtils.del(...keysToDelete);
                logger.info(`✅ Smart invalidated: ${pattern} (${keysToDelete.length} keys)`);
              }
            } else {
              await cacheUtils.del(pattern);
              logger.info(`✅ Smart invalidated key: ${pattern}`);
            }
          }
        } catch (error) {
          logger.error('❌ Smart cache invalidation error:', error);
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Clear Cache Middleware
 * Clears all cache or specific patterns
 */
export const clearCache = async (req, res) => {
  try {
    const { pattern } = req.query;
    
    if (pattern) {
      // Clear specific pattern (this would need pattern matching implementation)
      await cacheUtils.del(pattern);
      logger.info(`Cleared cache pattern: ${pattern}`);
    } else {
      // Clear all cache
      await cacheUtils.flushAll();
      logger.info('Cleared all cache');
    }

    res.json({
      success: true,
      message: pattern ? `Cache pattern '${pattern}' cleared` : 'All cache cleared'
    });
  } catch (error) {
    logger.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
}; 