import { cacheUtils } from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Simple Redis Cache Test
 * Demonstrates basic cache operations
 */
async function simpleRedisTest() {
  console.log('🔍 Simple Redis Cache Test\n');

  try {
    // Test 1: Set and Get Cache
    console.log('1. Testing Set/Get Cache...');
    
    const testKey = 'test:simple:user';
    const testData = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      timestamp: new Date().toISOString()
    };

    // Set cache with 60 seconds TTL
    const setResult = await cacheUtils.set(testKey, testData, 60);
    console.log(setResult ? '✅ Cache set successfully' : '❌ Cache set failed');

    // Get cache
    const getResult = await cacheUtils.get(testKey);
    if (getResult && getResult.name === testData.name) {
      console.log('✅ Cache retrieved successfully');
      console.log('   Data:', JSON.stringify(getResult, null, 2));
    } else {
      console.log('❌ Cache retrieval failed');
    }

    // Test 2: Check Cache Exists
    console.log('\n2. Testing Cache Existence...');
    const existsResult = await cacheUtils.exists(testKey);
    console.log(existsResult ? '✅ Cache key exists' : '❌ Cache key does not exist');

    // Test 3: Get TTL (Time To Live)
    console.log('\n3. Testing TTL...');
    const ttlResult = await cacheUtils.ttl(testKey);
    console.log(`✅ TTL: ${ttlResult} seconds remaining`);

    // Test 4: List All Keys
    console.log('\n4. Listing All Cache Keys...');
    const keysResult = await cacheUtils.keys('test:*');
    console.log('✅ Cache keys found:', keysResult);

    // Test 5: Delete Cache
    console.log('\n5. Testing Cache Deletion...');
    const delResult = await cacheUtils.del(testKey);
    console.log(delResult ? '✅ Cache deleted successfully' : '❌ Cache deletion failed');

    // Verify deletion
    const verifyResult = await cacheUtils.get(testKey);
    console.log(verifyResult === null ? '✅ Cache deletion verified' : '❌ Cache still exists');

    console.log('\n🎉 Simple Redis test completed successfully!');

  } catch (error) {
    console.error('\n❌ Redis test failed:', error);
    logger.error('Simple Redis test error:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleRedisTest();
}

export default simpleRedisTest; 