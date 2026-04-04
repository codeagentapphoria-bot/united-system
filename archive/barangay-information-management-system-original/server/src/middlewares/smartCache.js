import { cacheUtils } from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Smart Caching Strategy
 * Different cache strategies based on data type and frequency of changes
 */

// Cache TTL configurations
const CACHE_TTL = {
  // Static data - rarely changes (1 hour)
  STATIC: 3600,
  
  // Semi-static data - changes occasionally (10 minutes)
  SEMI_STATIC: 600,
  
  // Dynamic data - changes frequently (2 minutes)
  DYNAMIC: 120,
  
  // Real-time data - changes very frequently (30 seconds)
  REAL_TIME: 30,
  
  // No cache for critical data
  NO_CACHE: 0
};

// Route-based cache strategy mapping
const CACHE_STRATEGY = {
  // Static data - rarely changes
  '/municipality': CACHE_TTL.STATIC,
  '/barangay': CACHE_TTL.STATIC,
  '/classification-types': CACHE_TTL.STATIC,
  '/prefix': CACHE_TTL.STATIC,
  
  // Semi-static data - changes occasionally  
  '/officials': CACHE_TTL.SEMI_STATIC,
  '/puroks': CACHE_TTL.SEMI_STATIC,
  '/users': CACHE_TTL.SEMI_STATIC,
  
  // Dynamic data - changes frequently
  '/residents': CACHE_TTL.DYNAMIC,
  '/households': CACHE_TTL.DYNAMIC,
  '/pets': CACHE_TTL.DYNAMIC,
  '/inventories': CACHE_TTL.DYNAMIC,
  '/archives': CACHE_TTL.DYNAMIC,
  '/vaccines': CACHE_TTL.DYNAMIC,
  
  // Real-time data - changes very frequently
  '/requests': CACHE_TTL.REAL_TIME,
  '/statistics': CACHE_TTL.REAL_TIME,
  
  // No cache for critical data
  '/auth': CACHE_TTL.NO_CACHE,
  '/setup': CACHE_TTL.NO_CACHE
};

/**
 * Smart Cache Middleware
 * Automatically determines cache strategy based on route and data type
 */
export const smartCache = () => {
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
      // Determine cache strategy based on route
      const route = req.route?.path || req.path;
      let ttl = CACHE_TTL.DYNAMIC; // Default to dynamic
      let keyPrefix = 'smart:';
      
      // Find matching strategy
      for (const [pattern, strategyTtl] of Object.entries(CACHE_STRATEGY)) {
        if (route.includes(pattern)) {
          ttl = strategyTtl;
          keyPrefix = `${pattern.replace('/', '')}:`;
          break;
        }
      }
      
      // No cache for critical data
      if (ttl === CACHE_TTL.NO_CACHE) {
        return next();
      }

      // Generate cache key
      const cacheKey = `${keyPrefix}${req.originalUrl}`;
      
      // Try to get cached response
      const cachedResponse = await cacheUtils.get(cacheKey);
      
      if (cachedResponse) {
        logger.info(`Cache hit for key: ${cacheKey} (TTL: ${ttl}s)`);
        return res.json(cachedResponse);
      }

      // Store original send method
      const originalSend = res.json;
      
      // Override send method to cache the response
      res.json = function(data) {
        // Cache the response with determined TTL
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
      logger.error('Smart cache middleware error:', error);
      next();
    }
  };
};

/**
 * Enhanced Cache Invalidation
 * More precise cache invalidation based on data relationships
 */
export const smartInvalidateCache = () => {
  return async (req, res, next) => {
    // Store original methods
    const originalSend = res.json;
    
    // Function to get precise cache patterns based on route and operation
    const getPreciseCachePatterns = (req) => {
      const route = req.route?.path || req.path;
      const method = req.method;
      const patterns = [];
      
      // Base patterns for different entities
      const entityPatterns = {
        // Resident-related patterns
        '/resident': {
          GET: ['smart:residents:*', 'smart:resident:*'],
          POST: ['smart:residents:*', 'smart:statistics:*'],
          PUT: ['smart:residents:*', 'smart:resident:*', 'smart:statistics:*'],
          DELETE: ['smart:residents:*', 'smart:resident:*', 'smart:statistics:*']
        },
        
        // Household-related patterns
        '/household': {
          GET: ['smart:households:*', 'smart:household:*'],
          POST: ['smart:households:*', 'smart:statistics:*'],
          PUT: ['smart:households:*', 'smart:household:*', 'smart:statistics:*'],
          DELETE: ['smart:households:*', 'smart:household:*', 'smart:statistics:*']
        },
        
        // Pet-related patterns
        '/pets': {
          GET: ['smart:pets:*', 'smart:pet:*'],
          POST: ['smart:pets:*', 'smart:statistics:*'],
          PUT: ['smart:pets:*', 'smart:pet:*', 'smart:statistics:*'],
          DELETE: ['smart:pets:*', 'smart:pet:*', 'smart:statistics:*']
        },
        
        // Official-related patterns
        '/official': {
          GET: ['smart:officials:*', 'smart:official:*'],
          POST: ['smart:officials:*'],
          PUT: ['smart:officials:*', 'smart:official:*'],
          DELETE: ['smart:officials:*', 'smart:official:*']
        },
        
        // Purok-related patterns
        '/purok': {
          GET: ['smart:puroks:*', 'smart:purok:*'],
          POST: ['smart:puroks:*', 'smart:statistics:*'],
          PUT: ['smart:puroks:*', 'smart:purok:*', 'smart:statistics:*'],
          DELETE: ['smart:puroks:*', 'smart:purok:*', 'smart:statistics:*']
        },
        
        // Barangay-related patterns
        '/barangay': {
          GET: ['smart:barangays:*', 'smart:barangay:*'],
          POST: ['smart:barangays:*'],
          PUT: ['smart:barangays:*', 'smart:barangay:*'],
          DELETE: ['smart:barangays:*', 'smart:barangay:*']
        },
        
        // Municipality-related patterns
        '/municipality': {
          GET: ['smart:municipality:*'],
          POST: ['smart:municipality:*'],
          PUT: ['smart:municipality:*'],
          DELETE: ['smart:municipality:*']
        }
      };
      
      // Find matching patterns
      for (const [routePattern, methodPatterns] of Object.entries(entityPatterns)) {
        if (route.includes(routePattern)) {
          const methodPattern = methodPatterns[method] || methodPatterns['*'];
          if (methodPattern) {
            patterns.push(...methodPattern);
          }
        }
      }
      
      return [...new Set(patterns)]; // Remove duplicates
    };
    
    // Function to invalidate cache patterns
    const invalidateCachePatterns = async () => {
      try {
        const patterns = getPreciseCachePatterns(req);
        
        if (patterns.length === 0) {
          logger.info('No cache patterns to invalidate');
          return;
        }
        
        logger.info(`🔄 Starting precise cache invalidation for patterns: ${patterns.join(', ')}`);

        // Invalidate cache patterns
        for (const pattern of patterns) {
          if (pattern.includes('*')) {
            // Handle wildcard patterns
            const keysToDelete = await cacheUtils.keys(pattern);
            logger.info(`🔍 Pattern ${pattern} found ${keysToDelete.length} keys`);

            if (keysToDelete.length > 0) {
              await cacheUtils.del(...keysToDelete);
              logger.info(`✅ Invalidated cache pattern: ${pattern} (${keysToDelete.length} keys)`);
            }
          } else {
            // Handle exact key patterns
            await cacheUtils.del(pattern);
            logger.info(`✅ Invalidated cache key: ${pattern}`);
          }
        }

        logger.info(`🎯 Precise cache invalidation completed`);
      } catch (error) {
        logger.error('❌ Cache invalidation error:', error);
      }
    };
    
    // Override send method to invalidate cache after response
    res.json = async function(data) {
      // Only invalidate cache for successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await invalidateCachePatterns();
      }
      
      // Call original send method
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Conditional Cache Middleware
 * Allows selective caching based on request parameters
 */
export const conditionalCache = (conditionFn, ttl = 600) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if explicitly disabled
    if (req.headers['x-skip-cache'] === 'true') {
      return next();
    }

    // Check if caching should be applied
    if (!conditionFn(req)) {
      return next();
    }

    try {
      const cacheKey = `conditional:${req.originalUrl}`;
      
      // Try to get cached response
      const cachedResponse = await cacheUtils.get(cacheKey);
      
      if (cachedResponse) {
        logger.info(`Conditional cache hit for key: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      // Store original send method
      const originalSend = res.json;
      
      // Override send method to cache the response
      res.json = function(data) {
        cacheUtils.set(cacheKey, data, ttl)
          .then(() => {
            logger.info(`Conditional cached response for key: ${cacheKey}`);
          })
          .catch(error => {
            logger.error(`Failed to cache conditional response for key: ${cacheKey}`, error);
          });
        
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Conditional cache middleware error:', error);
      next();
    }
  };
};

export default {
  smartCache,
  smartInvalidateCache,
  conditionalCache,
  CACHE_TTL
};
