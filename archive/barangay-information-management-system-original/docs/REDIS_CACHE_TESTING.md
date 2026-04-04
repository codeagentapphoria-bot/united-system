# Redis Cache Testing Guide

This guide provides comprehensive methods to test if Redis is storing cache in your BIMS application.

## Quick Test Methods

### 1. **Run the Comprehensive Test Script**
```bash
cd server
npm run redis:test
```

### 2. **Run the Simple Test Script**
```bash
cd server
node src/scripts/simpleRedisTest.js
```

### 3. **Manual Redis CLI Testing**
```bash
# Connect to Redis CLI
redis-cli

# Test basic operations
127.0.0.1:6379> SET test:key "Hello Redis"
127.0.0.1:6379> GET test:key
127.0.0.1:6379> EXISTS test:key
127.0.0.1:6379> TTL test:key
127.0.0.1:6379> DEL test:key
127.0.0.1:6379> KEYS test:*
127.0.0.1:6379> FLUSHALL
127.0.0.1:6379> EXIT
```

## Testing Methods

### Method 1: Basic Connection Test
```bash
redis-cli ping
# Should return: PONG
```

### Method 2: Test Cache Operations
```bash
# Set cache with TTL
redis-cli SETEX test:user:123 3600 '{"id":123,"name":"John Doe"}'

# Get cache
redis-cli GET test:user:123

# Check TTL
redis-cli TTL test:user:123

# Check if exists
redis-cli EXISTS test:user:123

# Delete cache
redis-cli DEL test:user:123
```

### Method 3: Monitor Redis Operations
```bash
# Monitor all Redis commands in real-time
redis-cli MONITOR

# In another terminal, run your application
# You'll see all Redis operations as they happen
```

### Method 4: Check Redis Info
```bash
# Get Redis server information
redis-cli INFO

# Get memory usage
redis-cli INFO memory

# Get database size
redis-cli DBSIZE

# Get all keys
redis-cli KEYS "*"
```

### Method 5: Test API Caching
```bash
# Make a request to your API
curl -X GET http://localhost:3000/api/archives

# Check if response was cached
redis-cli KEYS "api:*"

# Make the same request again
curl -X GET http://localhost:3000/api/archives

# Check cache hit in logs
```

## Testing Cache Middleware

### Test Cache Hit/Miss
```bash
# First request (should miss cache)
curl -X GET http://localhost:3000/api/archives

# Second request (should hit cache)
curl -X GET http://localhost:3000/api/archives

# Check logs for cache hit/miss messages
```

### Test Cache Invalidation
```bash
# Make GET request to cache data
curl -X GET http://localhost:3000/api/archives

# Make POST/PUT/DELETE request to invalidate cache
curl -X POST http://localhost:3000/api/archives

# Make GET request again (should miss cache due to invalidation)
curl -X GET http://localhost:3000/api/archives
```

### Test Skip Cache Header
```bash
# Skip cache for this request
curl -X GET http://localhost:3000/api/archives \
  -H "X-Skip-Cache: true"
```

## Testing Session Management

### Test Session Storage
```bash
# Login to create session
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Check if session was stored
redis-cli KEYS "session:*"
```

### Test Session Retrieval
```bash
# Use session token in subsequent requests
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Testing Rate Limiting

### Test Rate Limit
```bash
# Make multiple requests quickly
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/archives
  echo "Request $i"
done

# Check rate limit counters
redis-cli KEYS "rate_limit:*"
```

## Testing User Cache

### Test User Data Caching
```bash
# Get user profile (should cache)
curl -X GET http://localhost:3000/api/user/profile

# Check if user data was cached
redis-cli KEYS "user:*"

# Update user profile (should invalidate cache)
curl -X PUT http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Check if cache was invalidated
redis-cli KEYS "user:*"
```

## Performance Testing

### Test Cache Performance
```bash
# Measure response time without cache
time curl -X GET http://localhost:3000/api/archives \
  -H "X-Skip-Cache: true"

# Measure response time with cache
time curl -X GET http://localhost:3000/api/archives
```

### Test Memory Usage
```bash
# Check Redis memory before operations
redis-cli INFO memory | grep used_memory_human

# Perform cache operations
# ... your operations ...

# Check Redis memory after operations
redis-cli INFO memory | grep used_memory_human
```

## Debugging Cache Issues

### Check Redis Logs
```bash
# View Redis server logs
sudo journalctl -u redis-server -f

# Or check Redis log file
sudo tail -f /var/log/redis/redis-server.log
```

### Check Application Logs
```bash
# View application logs for cache operations
tail -f logs/app.log | grep -i cache
```

### Test Redis Connection
```bash
# Test connection from application
node -e "
import { testRedisConnection } from './src/config/redis.js';
testRedisConnection().then(result => {
  console.log('Redis connection:', result ? 'OK' : 'FAILED');
});
"
```

## Common Cache Testing Scenarios

### Scenario 1: Cache Warming
```bash
# Pre-load frequently accessed data
curl -X GET http://localhost:3000/api/archives
curl -X GET http://localhost:3000/api/users
curl -X GET http://localhost:3000/api/statistics

# Check what's cached
redis-cli KEYS "api:*"
```

### Scenario 2: Cache Expiration
```bash
# Set cache with short TTL
redis-cli SETEX test:expire 5 "This will expire in 5 seconds"

# Check TTL
redis-cli TTL test:expire

# Wait 6 seconds
sleep 6

# Check if expired
redis-cli GET test:expire
```

### Scenario 3: Cache Eviction
```bash
# Fill cache with data
for i in {1..1000}; do
  redis-cli SET "key:$i" "value:$i"
done

# Check memory usage
redis-cli INFO memory | grep used_memory_human

# Add more data to trigger eviction
for i in {1001..2000}; do
  redis-cli SET "key:$i" "value:$i"
done
```

## Monitoring Tools

### Redis Commander (Web UI)
```bash
# Install Redis Commander
npm install -g redis-commander

# Start Redis Commander
redis-commander --redis-host localhost --redis-port 6379

# Access at http://localhost:8081
```

### Redis Insight (Redis Labs)
```bash
# Download and install Redis Insight
# Connect to localhost:6379
# Monitor cache operations in real-time
```

## Best Practices for Cache Testing

1. **Always test cache hit/miss scenarios**
2. **Verify cache invalidation works correctly**
3. **Test cache expiration and TTL**
4. **Monitor memory usage during testing**
5. **Test concurrent access patterns**
6. **Verify cache consistency across multiple requests**
7. **Test cache warming strategies**
8. **Monitor cache performance metrics**

## Troubleshooting

### Cache Not Working
```bash
# Check Redis connection
redis-cli ping

# Check Redis configuration
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy

# Check application logs
tail -f logs/app.log | grep -i redis
```

### Memory Issues
```bash
# Check memory usage
redis-cli INFO memory

# Check memory policy
redis-cli CONFIG GET maxmemory-policy

# Clear cache if needed
redis-cli FLUSHALL
```

### Performance Issues
```bash
# Check Redis performance
redis-cli INFO stats

# Monitor slow queries
redis-cli SLOWLOG GET 10
```

This guide covers all aspects of testing Redis cache storage in your BIMS application. Use these methods to ensure your caching system is working correctly and efficiently. 