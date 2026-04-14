# TICKET-023: Redis KEYS Command Causes Server Blocking

**Title**: Redis KEYS Command in delPattern Blocks Entire Server
**Type**: Performance
**Priority**: High
**Description**: The cache service uses redis.keys(pattern) which performs an O(N) scan of the entire keyspace and blocks the Redis server during execution. With thousands of cache keys, this causes latency spikes and potential timeouts.
**Steps to Reproduce** (if applicable):
1. Monitor Redis during cache invalidation
2. Observe server blocks during KEYS operation
**Expected Behavior**: Use SCAN command which is iterative and non-blocking.
**Actual Behavior**: redis.keys(pattern) at cache.service.ts line 76 blocks the entire Redis server.
**Suggested Fix / Approach**: Replace redis.keys() with redis.scan() using iterative pattern matching. Example: use a cursor-based SCAN that yields results incrementally without blocking.
**Affected Files**:
- borongan-eService-system-copy/multysis-backend/src/services/cache.service.ts (line 76)