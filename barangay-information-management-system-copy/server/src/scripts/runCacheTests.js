#!/usr/bin/env node

/**
 * Simple script to run automatic cache refresh tests
 * Usage: node src/scripts/runCacheTests.js
 */

import AutoCacheRefreshTester from './testAutoCacheRefresh.js';

console.log('🚀 BIMS Automatic Cache Refresh Test Suite');
console.log('==========================================\n');

const tester = new AutoCacheRefreshTester();

tester.runAllTests()
  .then(() => {
    console.log('\n✨ Test suite completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
