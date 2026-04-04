import ApiKeyModel from "../models/ApiKey.js";
import { ApiError } from "../utils/apiError.js";

// Simple in-memory rate limiter per API key (minute window)
const rateBuckets = new Map(); // keyId -> { windowStartMs, count }

// Extract API key from request headers or query string.
// NOTE: Authorization: Bearer is intentionally excluded — that header carries JWT tokens,
// not API keys. Extracting it here caused optionalApiKeyAuth to reject valid JWT sessions
// with 401 "Invalid or expired API key" before the JWT protect middleware could run.
const extractKey = (req) => {
  return req.headers["x-api-key"] ||
    req.query.api_key ||
    null;
};

// Validate key, scopes, and rate limit. Returns the key record on success.
// Returns null if no key is present (caller decides whether that's an error).
// Throws ApiError for invalid key, bad scopes, or rate limit exceeded.
const validateApiKey = async (key, requiredScopes) => {
  const record = await ApiKeyModel.findValidByKey(String(key));
  if (!record) throw new ApiError(401, "Invalid or expired API key");

  // Scope check
  if (requiredScopes.length) {
    const have = new Set((record.scopes || []).map(s => String(s)));
    const hasUmbrellaRead = have.has("read");
    const missing = requiredScopes.filter(s => !(have.has(s) || (hasUmbrellaRead && s.endsWith(".read"))));
    if (missing.length) throw new ApiError(403, "Insufficient permissions");
  }

  // Rate limiting per key (minute window)
  const limit = record.rateLimitPerMinute || 60;
  if (limit > 0) {
    const now = Date.now();
    const windowStartMs = now - (now % 60000);
    const bucket = rateBuckets.get(record.id) || { windowStartMs, count: 0 };
    if (bucket.windowStartMs !== windowStartMs) {
      bucket.windowStartMs = windowStartMs;
      bucket.count = 0;
    }
    bucket.count += 1;
    rateBuckets.set(record.id, bucket);
    if (bucket.count > limit) {
      throw new ApiError(429, `Rate limit exceeded (${limit}/min)`);
    }
  }

  return record;
};

// Attach openapi context to request after successful key validation
const attachOpenapiContext = (req, record) => {
  req.openapi = {
    apiKeyId: record.id,
    municipalityId: record.municipalityId,
    scopes: record.scopes,
    rateLimitPerMinute: record.rateLimitPerMinute,
  };
  ApiKeyModel.markUsed(record.id).catch(() => {});
};

// Strict: API key is required. Returns 401 if none is provided or invalid.
export const apiKeyAuth = (requiredScopes = []) => {
  return async (req, res, next) => {
    try {
      const key = extractKey(req);
      if (!key) throw new ApiError(401, "Missing API key");
      const record = await validateApiKey(key, requiredScopes);
      attachOpenapiContext(req, record);
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Optional: if no key is provided, falls through to JWT auth downstream.
// If a key IS provided, it must be valid and have the required scopes.
export const optionalApiKeyAuth = (requiredScopes = []) => {
  return async (req, res, next) => {
    try {
      const key = extractKey(req);
      if (!key) return next(); // No key — let JWT auth handle it
      const record = await validateApiKey(key, requiredScopes);
      attachOpenapiContext(req, record);
      next();
    } catch (err) {
      next(err);
    }
  };
};
