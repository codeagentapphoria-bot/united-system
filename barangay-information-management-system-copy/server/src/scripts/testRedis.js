import { testRedisConnection, cacheUtils, closeRedisConnection } from '../config/redis.js';
import redisService from '../services/redisService.js';
import logger from '../utils/logger.js';

/**
 * Redis Test Script
 * Tests all Redis functionality
 */
async function testRedis() {
  console.log('🧪 Starting Redis Tests...\n');

  try {
    // Test 1: Basic Connection
    console.log('1. Testing Redis Connection...');
    const isConnected = await testRedisConnection();
    if (isConnected) {
      console.log('✅ Redis connection successful');
    } else {
      console.log('❌ Redis connection failed');
      return;
    }

    // Test 2: Basic Cache Operations
    console.log('\n2. Testing Basic Cache Operations...');
    
    // Set cache
    const testKey = 'test:basic';
    const testData = { message: 'Hello Redis!', timestamp: new Date().toISOString() };
    const setResult = await cacheUtils.set(testKey, testData, 60);
    console.log(setResult ? '✅ Cache set successful' : '❌ Cache set failed');

    // Get cache
    const getResult = await cacheUtils.get(testKey);
    if (getResult && getResult.message === testData.message) {
      console.log('✅ Cache get successful');
    } else {
      console.log('❌ Cache get failed');
    }

    // Check exists
    const existsResult = await cacheUtils.exists(testKey);
    console.log(existsResult ? '✅ Cache exists check successful' : '❌ Cache exists check failed');

    // Delete cache
    const delResult = await cacheUtils.del(testKey);
    console.log(delResult ? '✅ Cache delete successful' : '❌ Cache delete failed');

    // Test 3: Session Management
    console.log('\n3. Testing Session Management...');
    
    const sessionId = 'test-session-123';
    const userData = { userId: 1, username: 'testuser', role: 'user' };
    
    // Store session
    const sessionStoreResult = await redisService.storeSession(sessionId, userData, 300);
    console.log(sessionStoreResult ? '✅ Session store successful' : '❌ Session store failed');

    // Get session
    const sessionGetResult = await redisService.getSession(sessionId);
    if (sessionGetResult && sessionGetResult.userId === userData.userId) {
      console.log('✅ Session get successful');
    } else {
      console.log('❌ Session get failed');
    }

    // Extend session
    const sessionExtendResult = await redisService.extendSession(sessionId, 600);
    console.log(sessionExtendResult ? '✅ Session extend successful' : '❌ Session extend failed');

    // Delete session
    const sessionDeleteResult = await redisService.deleteSession(sessionId);
    console.log(sessionDeleteResult ? '✅ Session delete successful' : '❌ Session delete failed');

    // Test 4: Rate Limiting
    console.log('\n4. Testing Rate Limiting...');
    
    const testIdentifier = 'test-rate-limit';
    
    // Test rate limit
    for (let i = 1; i <= 5; i++) {
      const rateLimit = await redisService.checkRateLimit(testIdentifier, 10, 60000);
      console.log(`Request ${i}: ${rateLimit.isAllowed ? '✅ Allowed' : '❌ Blocked'} (${rateLimit.current}/${rateLimit.limit})`);
    }

    // Reset rate limit
    const resetResult = await redisService.resetRateLimit(testIdentifier);
    console.log(resetResult ? '✅ Rate limit reset successful' : '❌ Rate limit reset failed');

    // Test 5: Token Management
    console.log('\n5. Testing Token Management...');
    
    const userId = 123;
    const refreshToken = 'test-refresh-token-123';
    
    // Store refresh token
    const tokenStoreResult = await redisService.storeRefreshToken(userId, refreshToken, 3600);
    console.log(tokenStoreResult ? '✅ Token store successful' : '❌ Token store failed');

    // Get refresh token
    const tokenGetResult = await redisService.getRefreshToken(userId);
    if (tokenGetResult === refreshToken) {
      console.log('✅ Token get successful');
    } else {
      console.log('❌ Token get failed');
    }

    // Delete refresh token
    const tokenDeleteResult = await redisService.deleteRefreshToken(userId);
    console.log(tokenDeleteResult ? '✅ Token delete successful' : '❌ Token delete failed');

    // Test 6: User Cache
    console.log('\n6. Testing User Cache...');
    
    const userCacheData = { id: 456, name: 'Test User', email: 'test@example.com' };
    
    // Cache user data
    const userCacheResult = await redisService.cacheUserData(userId, userCacheData, 1800);
    console.log(userCacheResult ? '✅ User cache successful' : '❌ User cache failed');

    // Get cached user data
    const cachedUserData = await redisService.getCachedUserData(userId);
    if (cachedUserData && cachedUserData.name === userCacheData.name) {
      console.log('✅ User cache get successful');
    } else {
      console.log('❌ User cache get failed');
    }

    // Invalidate user cache
    const invalidateResult = await redisService.invalidateUserCache(userId);
    console.log(invalidateResult ? '✅ User cache invalidation successful' : '❌ User cache invalidation failed');

    // Test 7: Notifications
    console.log('\n7. Testing Notifications...');
    
    const notification = {
      id: 1,
      type: 'info',
      message: 'Test notification',
      timestamp: new Date().toISOString()
    };
    
    // Store notification
    const notificationStoreResult = await redisService.storeNotification(userId, notification, 86400);
    console.log(notificationStoreResult ? '✅ Notification store successful' : '❌ Notification store failed');

    // Get notifications
    const notifications = await redisService.getUserNotifications(userId, 10);
    if (notifications.length > 0 && notifications[0].message === notification.message) {
      console.log('✅ Notifications get successful');
    } else {
      console.log('❌ Notifications get failed');
    }

    // Test 8: API Usage Tracking
    console.log('\n8. Testing API Usage Tracking...');
    
    const endpoint = '/api/test';
    const responseTime = 150;
    
    // Track API usage
    const trackingResult = await redisService.trackApiUsage(endpoint, userId, responseTime);
    console.log(trackingResult ? '✅ API usage tracking successful' : '❌ API usage tracking failed');

    // Get API usage stats
    const stats = await redisService.getApiUsageStats(endpoint, 1);
    console.log(`✅ API usage stats: ${stats.total} requests, ${stats.avgResponseTime}ms avg response time`);

    // Test 9: Multiple Cache Operations
    console.log('\n9. Testing Multiple Cache Operations...');
    
    const multipleData = {
      'test:key1': { value: 'data1' },
      'test:key2': { value: 'data2' },
      'test:key3': { value: 'data3' }
    };
    
    // Set multiple
    const msetResult = await cacheUtils.mset(multipleData, 300);
    console.log(msetResult ? '✅ Multiple cache set successful' : '❌ Multiple cache set failed');

    // Get multiple
    const keys = Object.keys(multipleData);
    const mgetResult = await cacheUtils.mget(keys);
    if (mgetResult.length === keys.length && mgetResult.every(item => item !== null)) {
      console.log('✅ Multiple cache get successful');
    } else {
      console.log('❌ Multiple cache get failed');
    }

    // Clean up multiple keys
    for (const key of keys) {
      await cacheUtils.del(key);
    }

    // Test 10: Health Check
    console.log('\n10. Testing Health Check...');
    
    const healthResult = await redisService.healthCheck();
    console.log(healthResult ? '✅ Health check successful' : '❌ Health check failed');

    // Test 11: Statistics
    console.log('\n11. Testing Statistics...');
    
    const statsResult = await redisService.getInfo();
    if (statsResult) {
      console.log(`✅ Statistics successful - Keys: ${statsResult.keys}`);
    } else {
      console.log('❌ Statistics failed');
    }

    console.log('\n🎉 All Redis tests completed successfully!');
    console.log('\n📊 Redis is fully functional and ready for use.');

  } catch (error) {
    console.error('\n❌ Redis test failed:', error);
    logger.error('Redis test error:', error);
  } finally {
    // Close Redis connection
    await closeRedisConnection();
    console.log('\n🔌 Redis connection closed');
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRedis();
}

export default testRedis; 