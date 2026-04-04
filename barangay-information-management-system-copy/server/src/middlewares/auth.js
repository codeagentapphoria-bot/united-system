// middlewares/auth.js

import { verifyToken } from '../config/jwt.js';
import { ApiError } from '../utils/apiError.js';
import User from '../models/User.js';
import { cacheUtils } from '../config/redis.js';

const USER_CACHE_TTL = 300; // 5 minutes

// Protect route - only for authenticated users
export const protect = async (req, res, next) => {
  try {
    // Skip JWT protection for public Open API data endpoints, but NOT for admin key management (/api/openapi/keys)
    const isOpenApi = req.path?.startsWith('/openapi') || req.originalUrl?.startsWith('/api/openapi');
    const isKeyAdmin = req.path?.startsWith('/openapi/keys') || req.originalUrl?.startsWith('/api/openapi/keys');
    if (isOpenApi && !isKeyAdmin) {
      return next();
    }
    // Skip JWT protection for public endpoints (routes starting with /public/)
    const isPublicRoute = req.path?.startsWith('/public/') || req.originalUrl?.includes('/public/');
    if (isPublicRoute) {
      return next();
    }
    // Skip if already authenticated via API key (if apiKeyAuth ran first)
    if (req.openapi) {
      return next();
    }
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, no token');
    }

    const decoded = verifyToken(token);
    const cacheKey = `bims:user:${decoded.userId}`;

    let userFields = await cacheUtils.get(cacheKey);

    if (!userFields) {
      const user = await User.findById(decoded.userId);
      if (!user) throw new ApiError(401, 'User no longer exists');
      userFields = {
        id: user.id,
        email: user.email,
        target_type: user.target_type,
        target_id: user.target_id,
        role: user.role,
        picture_path: user.picture_path,
      };
      cacheUtils.set(cacheKey, userFields, USER_CACHE_TTL).catch(() => {});
    }

    req.user = userFields;

    // Fire-and-forget — audit must not block the response
    import('../config/db.js').then(async ({ pool }) => {
      const client = await pool.connect();
      await client.query('SELECT set_config($1, $2, false)', ['audit.user_id', req.user.id.toString()]);
      client.release();
    }).catch((error) => {
      console.warn('Failed to set audit user:', error.message);
    });

    next();
  } catch (err) {
    next(err);
  }
};

// Restrict to roles: 'admin', 'staff'
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    const isOpenApi = req.path?.startsWith('/openapi') || req.originalUrl?.startsWith('/api/openapi');
    const isKeyAdmin = req.path?.startsWith('/openapi/keys') || req.originalUrl?.startsWith('/api/openapi/keys');
    const isPublicRoute = req.path?.startsWith('/public/') || req.originalUrl?.includes('/public/');
    if (req.openapi || (isOpenApi && !isKeyAdmin) || isPublicRoute) {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Forbidden - Insufficient role');
    }
    next();
  };
};

// Restrict to target types: 'municipality', 'barangay'
export const restrictByTargetType = (...types) => {
  return (req, res, next) => {
    const isOpenApi = req.path?.startsWith('/openapi') || req.originalUrl?.startsWith('/api/openapi');
    const isKeyAdmin = req.path?.startsWith('/openapi/keys') || req.originalUrl?.startsWith('/api/openapi/keys');
    const isPublicRoute = req.path?.startsWith('/public/') || req.originalUrl?.includes('/public/');
    if (req.openapi || (isOpenApi && !isKeyAdmin) || isPublicRoute) {
      return next();
    }
    if (!types.includes(req.user.target_type)) {
      throw new ApiError(403, 'Forbidden - Invalid target type');
    }
    next();
  };
};

// Combined shortcuts for cleaner usage
export const municipalityAdminOnly = [
  protect,
  restrictTo('admin'),
  restrictByTargetType('municipality')
];

export const municipalityUsersOnly = [
  protect,
  restrictTo('admin', 'staff'),
  restrictByTargetType('municipality')
];

export const barangayUsersOnly = [
  protect,
  restrictTo('admin', 'staff'),
  restrictByTargetType('barangay')
];

export const municipalityStaffOnly = [
  protect,
  restrictTo('staff'),
  restrictByTargetType('municipality')
];

export const barangayAdminOnly = [
  protect,
  restrictTo('admin'),
  restrictByTargetType('barangay')
];

export const barangayStaffOnly = [
  protect,
  restrictTo('staff'),
  restrictByTargetType('barangay')
];

export const allUsers = [
  protect,
  restrictTo('admin', 'staff'),
  restrictByTargetType('municipality', 'barangay')
];
