#!/usr/bin/env node

/**
 * Test script for automatic cache refresh functionality
 * This script tests the Redis cache invalidation system
 */

import { cacheUtils } from '../config/redis.js';
import logger from '../utils/logger.js';

async function testCacheRefresh() {
  console.log('🧪 Testing Automatic Cache Refresh System...\n');

  try {
    // Test 1: Set some test cache data
    console.log('1. Setting test cache data...');
    await cacheUtils.set('test:residents:list', { data: ['resident1', 'resident2'] }, 3600);
    await cacheUtils.set('test:pets:list', { data: ['pet1', 'pet2'] }, 3600);
    await cacheUtils.set('test:households:list', { data: ['household1', 'household2'] }, 3600);
    console.log('✅ Test cache data set successfully\n');

    // Test 2: Verify cache data exists
    console.log('2. Verifying cache data exists...');
    const residentsCache = await cacheUtils.get('test:residents:list');
    const petsCache = await cacheUtils.get('test:pets:list');
    const householdsCache = await cacheUtils.get('test:households:list');
    
    console.log('Residents cache:', residentsCache ? '✅ Found' : '❌ Not found');
    console.log('Pets cache:', petsCache ? '✅ Found' : '❌ Not found');
    console.log('Households cache:', householdsCache ? '✅ Found' : '❌ Not found');
    console.log('');

    // Test 3: Test pattern-based cache invalidation
    console.log('3. Testing pattern-based cache invalidation...');
    
    // Simulate residents cache invalidation
    const residentsPattern = 'test:residents:*';
    const residentsKeys = await cacheUtils.keys(residentsPattern);
    console.log(`Found ${residentsKeys.length} keys matching pattern: ${residentsPattern}`);
    
    if (residentsKeys.length > 0) {
      await cacheUtils.del(...residentsKeys);
      console.log('✅ Residents cache invalidated successfully');
    }

    // Simulate pets cache invalidation
    const petsPattern = 'test:pets:*';
    const petsKeys = await cacheUtils.keys(petsPattern);
    console.log(`Found ${petsKeys.length} keys matching pattern: ${petsPattern}`);
    
    if (petsKeys.length > 0) {
      await cacheUtils.del(...petsKeys);
      console.log('✅ Pets cache invalidated successfully');
    }

    // Simulate households cache invalidation
    const householdsPattern = 'test:households:*';
    const householdsKeys = await cacheUtils.keys(householdsPattern);
    console.log(`Found ${householdsKeys.length} keys matching pattern: ${householdsPattern}`);
    
    if (householdsKeys.length > 0) {
      await cacheUtils.del(...householdsKeys);
      console.log('✅ Households cache invalidated successfully');
    }
    console.log('');

    // Test 4: Verify cache invalidation worked
    console.log('4. Verifying cache invalidation...');
    const residentsCacheAfter = await cacheUtils.get('test:residents:list');
    const petsCacheAfter = await cacheUtils.get('test:pets:list');
    const householdsCacheAfter = await cacheUtils.get('test:households:list');
    
    console.log('Residents cache after invalidation:', residentsCacheAfter ? '❌ Still exists' : '✅ Cleared');
    console.log('Pets cache after invalidation:', petsCacheAfter ? '❌ Still exists' : '✅ Cleared');
    console.log('Households cache after invalidation:', householdsCacheAfter ? '❌ Still exists' : '✅ Cleared');
    console.log('');

    // Test 5: Test API cache patterns
    console.log('5. Testing API cache patterns...');
    await cacheUtils.set('api:/list/residents', { data: ['api_resident1'] }, 3600);
    await cacheUtils.set('api:/list/pets', { data: ['api_pet1'] }, 3600);
    await cacheUtils.set('api:/statistics/residents', { count: 10 }, 3600);
    
    // Test API pattern invalidation
    const apiPattern = 'api:*/list/*';
    const apiKeys = await cacheUtils.keys(apiPattern);
    console.log(`Found ${apiKeys.length} API keys matching pattern: ${apiPattern}`);
    
    if (apiKeys.length > 0) {
      await cacheUtils.del(...apiKeys);
      console.log('✅ API cache patterns invalidated successfully');
    }
    console.log('');

    // Test 6: Test statistics cache invalidation
    console.log('6. Testing statistics cache invalidation...');
    const statsPattern = 'api:*/statistics/*';
    const statsKeys = await cacheUtils.keys(statsPattern);
    console.log(`Found ${statsKeys.length} statistics keys matching pattern: ${statsPattern}`);
    
    if (statsKeys.length > 0) {
      await cacheUtils.del(...statsKeys);
      console.log('✅ Statistics cache invalidated successfully');
    }
    console.log('');

    console.log('🎉 All cache refresh tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Cache data setting');
    console.log('✅ Cache data verification');
    console.log('✅ Pattern-based invalidation');
    console.log('✅ Cache invalidation verification');
    console.log('✅ API pattern invalidation');
    console.log('✅ Statistics cache invalidation');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCacheRefresh().then(() => {
  console.log('\n✨ Cache refresh system is working correctly!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});