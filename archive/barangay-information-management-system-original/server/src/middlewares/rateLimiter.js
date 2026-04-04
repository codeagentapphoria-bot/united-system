import redisService from '../services/redisService.js';
import logger from '../utils/logger.js';

/**
 * Rate Limiting Middleware
 * Uses Redis to track and limit API requests
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100, // max requests per window
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    keyGenerator = (req) => {
      // Use IP address as default identifier
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (req, res, next) => {
    try {
      const identifier = keyGenerator(req);
      const rateLimit = await redisService.checkRateLimit(identifier, maxRequests, windowMs);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimit.limit,
        'X-RateLimit-Remaining': rateLimit.remaining,
        'X-RateLimit-Reset': new Date(Date.now() + rateLimit.resetTime * 1000).toISOString()
      });

      // Check if request is allowed
      if (!rateLimit.isAllowed) {
        logger.warn(`Rate limit exceeded for ${identifier}: ${rateLimit.current}/${maxRequests}`);
        
        return res.status(statusCode).json({
          success: false,
          message,
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimit.resetTime
        });
      }

      // Track successful requests if needed
      if (!skipSuccessfulRequests) {
        redisService.trackApiUsage(req.path, req.user?.id, 0);
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On Redis error, allow the request to proceed
      next();
    }
  };
};

/**
 * User-specific Rate Limiter
 * Different limits for different user types
 */
export const userRateLimiter = (options = {}) => {
  const {
    defaultLimit = 100,
    premiumLimit = 500,
    adminLimit = 1000,
    windowMs = 15 * 60 * 1000
  } = options;

  return async (req, res, next) => {
    try {
      const identifier = req.user?.id || req.ip || 'anonymous';
      let maxRequests = defaultLimit;

      // Adjust limits based on user role
      if (req.user?.role === 'admin') {
        maxRequests = adminLimit;
      } else if (req.user?.role === 'premium') {
        maxRequests = premiumLimit;
      }

      const rateLimit = await redisService.checkRateLimit(identifier, maxRequests, windowMs);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimit.limit,
        'X-RateLimit-Remaining': rateLimit.remaining,
        'X-RateLimit-Reset': new Date(Date.now() + rateLimit.resetTime * 1000).toISOString()
      });

      if (!rateLimit.isAllowed) {
        logger.warn(`User rate limit exceeded for ${identifier}: ${rateLimit.current}/${maxRequests}`);
        
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded for your account type',
          error: 'USER_RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimit.resetTime
        });
      }

      next();
    } catch (error) {
      logger.error('User rate limiter error:', error);
      next();
    }
  };
};

/**
 * Endpoint-specific Rate Limiter
 * Different limits for different endpoints
 */
export const endpointRateLimiter = (endpointLimits = {}) => {
  return async (req, res, next) => {
    try {
      const endpoint = req.path;
      const limit = endpointLimits[endpoint] || 100;
      const identifier = req.user?.id || req.ip || 'anonymous';

      const rateLimit = await redisService.checkRateLimit(
        `${identifier}:${endpoint}`,
        limit,
        15 * 60 * 1000
      );

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimit.limit,
        'X-RateLimit-Remaining': rateLimit.remaining,
        'X-RateLimit-Reset': new Date(Date.now() + rateLimit.resetTime * 1000).toISOString()
      });

      if (!rateLimit.isAllowed) {
        logger.warn(`Endpoint rate limit exceeded for ${endpoint}: ${rateLimit.current}/${limit}`);
        
        return res.status(429).json({
          success: false,
          message: `Rate limit exceeded for ${endpoint}`,
          error: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimit.resetTime
        });
      }

      next();
    } catch (error) {
      logger.error('Endpoint rate limiter error:', error);
      next();
    }
  };
};

/**
 * Burst Rate Limiter
 * Allows burst requests with a cooldown period
 */
export const burstRateLimiter = (options = {}) => {
  const {
    burstLimit = 10,
    burstWindow = 60 * 1000, // 1 minute
    cooldownWindow = 5 * 60 * 1000, // 5 minutes
    keyGenerator = (req) => req.ip || req.connection.remoteAddress || 'unknown'
  } = options;

  return async (req, res, next) => {
    try {
      const identifier = keyGenerator(req);
      const burstKey = `burst:${identifier}`;
      const cooldownKey = `cooldown:${identifier}`;

      // Check if in cooldown period
      const inCooldown = await redisService.getSession(cooldownKey);
      if (inCooldown) {
        return res.status(429).json({
          success: false,
          message: 'Burst limit exceeded. Please wait before making more requests.',
          error: 'BURST_LIMIT_COOLDOWN',
          retryAfter: 300 // 5 minutes
        });
      }

      // Check burst limit
      const burstCount = await redisService.incr(burstKey);
      if (burstCount === 1) {
        await redisService.expire(burstKey, Math.floor(burstWindow / 1000));
      }

      if (burstCount > burstLimit) {
        // Set cooldown period
        await redisService.storeSession(cooldownKey, true, Math.floor(cooldownWindow / 1000));
        
        logger.warn(`Burst limit exceeded for ${identifier}: ${burstCount}/${burstLimit}`);
        
        return res.status(429).json({
          success: false,
          message: 'Burst limit exceeded. Please wait before making more requests.',
          error: 'BURST_LIMIT_EXCEEDED',
          retryAfter: 300
        });
      }

      next();
    } catch (error) {
      logger.error('Burst rate limiter error:', error);
      next();
    }
  };
}; 