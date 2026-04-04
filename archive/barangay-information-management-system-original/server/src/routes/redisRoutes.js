import express from 'express';
import { cacheStats, clearCache } from '../middlewares/redisCache.js';
import { testRedisConnection, cacheUtils } from '../config/redis.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route   GET /api/redis/status
 * @desc    Test Redis connection
 * @access  Private (Admin only)
 */
router.get('/status', async (req, res) => {
  try {
    const isConnected = await testRedisConnection();
    
    res.json({
      success: true,
      data: {
        connected: isConnected,
        timestamp: new Date().toISOString(),
        message: isConnected ? 'Redis is connected and working' : 'Redis connection failed'
      }
    });
  } catch (error) {
    logger.error('Redis status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Redis status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/redis/stats
 * @desc    Get Redis cache statistics
 * @access  Private (Admin only)
 */
router.get('/stats', cacheStats);

/**
 * @route   DELETE /api/redis/cache
 * @desc    Clear Redis cache
 * @access  Private (Admin only)
 */
router.delete('/cache', clearCache);

/**
 * @route   POST /api/redis/clear-pattern
 * @desc    Clear specific cache patterns
 * @access  Private (Admin only)
 */
router.post('/clear-pattern', async (req, res) => {
  try {
    const { patterns } = req.body;
    
    if (!patterns || !Array.isArray(patterns)) {
      return res.status(400).json({
        success: false,
        message: 'Patterns array is required'
      });
    }
    
    let totalCleared = 0;
    const results = [];
    
    for (const pattern of patterns) {
      const keysToDelete = await cacheUtils.keys(pattern);
      if (keysToDelete.length > 0) {
        await cacheUtils.del(...keysToDelete);
        totalCleared += keysToDelete.length;
        results.push({
          pattern,
          keysCleared: keysToDelete.length,
          keys: keysToDelete
        });
      } else {
        results.push({
          pattern,
          keysCleared: 0,
          keys: []
        });
      }
    }
    
    logger.info(`Manual cache clear: ${totalCleared} keys cleared across ${patterns.length} patterns`);
    
    res.json({
      success: true,
      message: `Cleared ${totalCleared} cache keys`,
      results
    });
  } catch (error) {
    logger.error('Manual cache clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache patterns'
    });
  }
});

/**
 * @route   GET /api/redis/health
 * @desc    Redis health check endpoint
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const isConnected = await testRedisConnection();
    
    if (isConnected) {
      res.status(200).json({
        status: 'healthy',
        service: 'redis',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        service: 'redis',
        timestamp: new Date().toISOString(),
        message: 'Redis connection failed'
      });
    }
  } catch (error) {
    logger.error('Redis health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'redis',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router; 