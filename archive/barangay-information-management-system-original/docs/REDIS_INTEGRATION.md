# Redis Integration Guide

This document provides comprehensive information about Redis integration in the BIMS application.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Features](#features)
5. [Usage Examples](#usage-examples)
6. [API Endpoints](#api-endpoints)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

## Overview

Redis has been integrated into the BIMS application to provide:
- **Caching**: Improve API response times
- **Session Management**: Store user sessions
- **Rate Limiting**: Protect against abuse
- **Token Management**: Handle refresh tokens
- **Notifications**: Store user notifications
- **Analytics**: Track API usage

## Installation

Redis is automatically installed during the server setup process. If you need to install it manually:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test installation
redis-cli ping
# Should return: PONG
```

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Redis Configuration File

The Redis configuration is located at `server/src/config/redis.js` and includes:

- Connection settings
- Error handling
- Event listeners
- Cache utilities
- Health checks

## Features

### 1. Caching System

#### Basic Cache Operations

```javascript
import { cacheUtils } from '../config/redis.js';

// Set cache with TTL (default: 1 hour)
await cacheUtils.set('user:123', userData, 3600);

// Get cache
const userData = await cacheUtils.get('user:123');

// Check if key exists
const exists = await cacheUtils.exists('user:123');

// Delete cache
await cacheUtils.del('user:123');

// Multiple operations
await cacheUtils.mset({
  'user:1': user1Data,
  'user:2': user2Data
}, 3600);

const users = await cacheUtils.mget(['user:1', 'user:2']);
```

#### API Response Caching

```javascript
import { redisCache } from '../middlewares/redisCache.js';

// Cache all GET requests for 1 hour
app.use('/api/public', redisCache(3600));

// Cache specific routes
app.use('/api/statistics', redisCache(1800, 'stats:'));

// Skip cache for specific requests
// Add header: X-Skip-Cache: true
```

### 2. Session Management

```javascript
import redisService from '../services/redisService.js';

// Store session (24 hours default)
await redisService.storeSession('session-id', userData, 86400);

// Get session
const session = await redisService.getSession('session-id');

// Extend session
await redisService.extendSession('session-id', 86400);

// Delete session
await redisService.deleteSession('session-id');
```

### 3. Rate Limiting

#### Global Rate Limiter

```javascript
import { rateLimiter } from '../middlewares/rateLimiter.js';

// 100 requests per 15 minutes
app.use(rateLimiter({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000
}));
```

#### User-specific Rate Limiter

```javascript
import { userRateLimiter } from '../middlewares/rateLimiter.js';

// Different limits for different user types
app.use(userRateLimiter({
  defaultLimit: 100,
  premiumLimit: 500,
  adminLimit: 1000
}));
```

#### Endpoint-specific Rate Limiter

```javascript
import { endpointRateLimiter } from '../middlewares/rateLimiter.js';

// Different limits for different endpoints
app.use(endpointRateLimiter({
  '/api/auth/login': 5,    // 5 login attempts per 15 minutes
  '/api/upload': 10,       // 10 uploads per 15 minutes
  '/api/export': 2         // 2 exports per 15 minutes
}));
```

### 4. Token Management

```javascript
import redisService from '../services/redisService.js';

// Store refresh token (7 days default)
await redisService.storeRefreshToken(userId, token, 604800);

// Get refresh token
const token = await redisService.getRefreshToken(userId);

// Delete refresh token
await redisService.deleteRefreshToken(userId);
```

### 5. Notifications

```javascript
import redisService from '../services/redisService.js';

// Store notification (30 days default)
await redisService.storeNotification(userId, {
  id: 1,
  type: 'info',
  message: 'Welcome to BIMS!',
  timestamp: new Date().toISOString()
}, 2592000);

// Get user notifications
const notifications = await redisService.getUserNotifications(userId, 50);
```

### 6. Analytics

```javascript
import redisService from '../services/redisService.js';

// Track API usage
await redisService.trackApiUsage('/api/users', userId, 150);

// Get API usage statistics
const stats = await redisService.getApiUsageStats('/api/users', 24);
// Returns: { total: 1250, avgResponseTime: 145 }
```

## Usage Examples

### Example 1: Caching User Data

```javascript
// In your controller
import { cacheUtils } from '../config/redis.js';

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `user:${id}`;
    
    // Try to get from cache first
    let user = await cacheUtils.get(cacheKey);
    
    if (!user) {
      // Get from database
      user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      
      // Cache for 1 hour
      await cacheUtils.set(cacheKey, user, 3600);
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Example 2: Rate Limited Login

```javascript
// In your auth routes
import { endpointRateLimiter } from '../middlewares/rateLimiter.js';

// Apply rate limiting to login endpoint
router.post('/login', 
  endpointRateLimiter({ '/api/auth/login': 5 }),
  async (req, res) => {
    // Login logic here
  }
);
```

### Example 3: Session-based Authentication

```javascript
// In your auth middleware
import redisService from '../services/redisService.js';

export const authenticateSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(401).json({ message: 'Session required' });
    }
    
    const session = await redisService.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ message: 'Invalid session' });
    }
    
    // Extend session
    await redisService.extendSession(sessionId);
    
    req.user = session;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authentication error' });
  }
};
```

## API Endpoints

### Redis Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/redis/status` | Check Redis connection status |
| GET | `/api/redis/stats` | Get Redis cache statistics |
| DELETE | `/api/redis/cache` | Clear Redis cache |
| GET | `/api/redis/health` | Redis health check |

### Health Check Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Overall application health including Redis |

### Example Usage

```bash
# Check Redis status
curl http://localhost:5000/api/redis/status

# Get cache statistics
curl http://localhost:5000/api/redis/stats

# Clear all cache
curl -X DELETE http://localhost:5000/api/redis/cache

# Health check
curl http://localhost:5000/health
```

## Monitoring

### Redis CLI Commands

```bash
# Connect to Redis
redis-cli

# Monitor Redis in real-time
redis-cli monitor

# Get Redis info
redis-cli info

# Get memory usage
redis-cli info memory

# Get connected clients
redis-cli client list

# Get database size
redis-cli dbsize

# Get all keys (use with caution)
redis-cli keys "*"

# Get keys matching pattern
redis-cli keys "user:*"
```

### Application Monitoring

```bash
# Test Redis functionality
npm run redis:test

# Check Redis service status
sudo systemctl status redis-server

# View Redis logs
sudo journalctl -u redis-server -f
```

### Performance Monitoring

The application automatically tracks:
- API response times
- Cache hit/miss rates
- Rate limit violations
- Session usage

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed

**Error**: `Redis connection error: ECONNREFUSED`

**Solution**:
```bash
# Check if Redis is running
sudo systemctl status redis-server

# Start Redis if not running
sudo systemctl start redis-server

# Check Redis port
sudo netstat -tlnp | grep 6379
```

#### 2. Redis Memory Issues

**Error**: `Redis out of memory`

**Solution**:
```bash
# Check Redis memory usage
redis-cli info memory

# Configure Redis memory limits in /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

#### 3. Cache Not Working

**Issue**: Cache operations failing

**Solution**:
```bash
# Test Redis connection
npm run redis:test

# Check Redis logs
sudo journalctl -u redis-server -n 50

# Verify environment variables
echo $REDIS_HOST
echo $REDIS_PORT
```

### Debug Mode

Enable debug logging by setting in your `.env`:

```env
LOG_LEVEL=debug
```

### Performance Optimization

1. **Use appropriate TTL values**:
   - User data: 1 hour
   - Static data: 24 hours
   - Session data: 24 hours
   - API responses: 15 minutes

2. **Monitor memory usage**:
   ```bash
   redis-cli info memory
   ```

3. **Use pipeline for multiple operations**:
   ```javascript
   const pipeline = redis.pipeline();
   pipeline.set('key1', 'value1');
   pipeline.set('key2', 'value2');
   await pipeline.exec();
   ```

4. **Implement cache warming**:
   ```javascript
   // Pre-load frequently accessed data
   const popularUsers = await db.query('SELECT * FROM users ORDER BY last_login DESC LIMIT 100');
   await cacheUtils.mset(popularUsers.reduce((acc, user) => {
     acc[`user:${user.id}`] = user;
     return acc;
   }, {}), 3600);
   ```

## Best Practices

1. **Always handle Redis errors gracefully**
2. **Use appropriate TTL values for different data types**
3. **Monitor Redis memory usage**
4. **Implement cache invalidation strategies**
5. **Use Redis for temporary data, not permanent storage**
6. **Test Redis functionality regularly**
7. **Backup Redis data if needed**
8. **Use Redis clustering for high availability**

## Security Considerations

1. **Set Redis password** in production
2. **Bind Redis to localhost** only
3. **Disable dangerous commands** in production
4. **Use SSL/TLS** for Redis connections in production
5. **Regular security updates**
6. **Monitor Redis access logs**

## Migration Guide

If you're migrating from a different caching solution:

1. **Install Redis** (already done)
2. **Update environment variables**
3. **Test Redis functionality**: `npm run redis:test`
4. **Gradually migrate cache operations**
5. **Monitor performance improvements**
6. **Remove old caching code**

## Support

For Redis-related issues:

1. Check this documentation
2. Run `npm run redis:test`
3. Check Redis logs: `sudo journalctl -u redis-server`
4. Review application logs
5. Check Redis configuration: `/etc/redis/redis.conf`

---

**Note**: Redis is now fully integrated into your BIMS application. The system will automatically use Redis for caching, sessions, rate limiting, and other performance optimizations. 