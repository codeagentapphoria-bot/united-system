import ApiKeyModel from "../models/ApiKey.js";
import { ApiError } from "../utils/apiError.js";

// Simple in-memory rate limiter per API key (minute window)
const rateBuckets = new Map(); // keyId -> { windowStartMs, count }

export const apiKeyAuth = (requiredScopes = []) => {
  return async (req, res, next) => {
    try {
      let key = req.headers["x-api-key"] || req.query.api_key;
      // Also accept Authorization: Bearer <key>
      if (!key && req.headers.authorization?.startsWith("Bearer ")) {
        key = req.headers.authorization.split(" ")[1];
      }

      if (!key) {
        throw new ApiError(401, "Missing API key");
      }

      const record = await ApiKeyModel.findValidByKey(String(key));
      if (!record) {
        throw new ApiError(401, "Invalid or expired API key");
      }

      // Scope check (every required scope must be present)
      if (requiredScopes.length) {
        const have = new Set((record.scopes || []).map(s => String(s)));
        // Allow umbrella "read" to satisfy any *.read scope
        const hasUmbrellaRead = have.has("read");
        const missing = requiredScopes.filter(s => !(have.has(s) || (hasUmbrellaRead && s.endsWith('.read'))));
        if (missing.length) {
          throw new ApiError(403, "Insufficient permissions");
        }
      }

      // Rate limiting per key (minute window)
      const limit = record.rateLimitPerMinute || 60;
      if (limit > 0) {
        const now = Date.now();
        const windowStartMs = now - (now % 60000); // floor to current minute
        const bucket = rateBuckets.get(record.id) || { windowStartMs, count: 0 };
        if (bucket.windowStartMs !== windowStartMs) {
          bucket.windowStartMs = windowStartMs;
          bucket.count = 0;
        }
        bucket.count += 1;
        rateBuckets.set(record.id, bucket);

        if (bucket.count > limit) {
          res.status(429).json({ success: false, message: "Rate limit exceeded", error: { code: "RATE_LIMIT", details: `${limit}/min` } });
          return;
        }
      }

      // Attach openapi context
      req.openapi = {
        apiKeyId: record.id,
        municipalityId: record.municipalityId,
        scopes: record.scopes,
        rateLimitPerMinute: record.rateLimitPerMinute,
      };

      // Prevent downstream JWT middleware from treating API key as JWT
      if (req.headers && req.headers.authorization?.startsWith("Bearer ")) {
        delete req.headers.authorization;
      }

      // Best effort last_used update (non-blocking)
      ApiKeyModel.markUsed(record.id).catch(() => {});

      next();
    } catch (err) {
      next(err);
    }
  };
};


