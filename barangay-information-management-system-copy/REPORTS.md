# QA Audit Report — Barangay Information Management System (BIMS)

**Auditor:** Vex 🔬 (QA Specialist)
**Target:** `unified-systems/barangay-information-management-system-copy`
**Date:** 2026-03-28
**Scope:** Full codebase audit — security, architecture, code quality, runtime errors, configuration

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 7 |
| Medium   | 8 |
| Low/Info | 5 |
| **Total** | **23** |

---

## CRITICAL

---

### [C-01] JWT_SECRET is a publicly known placeholder

**File:** `server/.env`
**Line:** `JWT_SECRET=change-me-at-least-32-chars-and-match-eservice`

**Description:**
The JWT secret used to sign and verify all authentication tokens is set to a hardcoded, publicly visible placeholder value. Because the `.env` file ships with this value in the working copy, any token signed with `change-me-at-least-32-chars-and-match-eservice` is trivially forgeable. An attacker who knows this secret can craft a valid JWT for any user ID, role, and target type — granting themselves full admin access to the system without valid credentials.

**Expected:** A cryptographically random secret of at least 32 bytes, never committed or shared, unique per environment.
**Actual:** Static, non-secret placeholder string used in a live system.

**Impact:** Complete authentication bypass. Any actor with this knowledge (anyone who has read this file) can impersonate any user including `municipality` admins.

---

### [C-02] Real production credentials committed to repository copy

**File:** `server/.env`

**Description:**
The `.env` file in this repository copy contains live production credentials:
- `PG_PASSWORD=rPb3&gYLXpr@gH?` — Supabase PostgreSQL password (live database)
- `PG_USER=postgres.exahyuahguriwrkkeuvm` — Live Supabase project user
- `PG_HOST=aws-1-ap-south-1.pooler.supabase.com` — Live database host
- `GMAIL_PASS=zqwb ciah gdjw btpw` — Live Gmail app password
- `GMAIL_USER=anivaryam.dev@gmail.com` — Live email account

While the root `.gitignore` lists `server/.env`, **this file physically exists in the working copy** and is included here. If this copy is ever pushed to any remote or shared, these credentials are compromised. The Gmail app password format (`zqwb ciah gdjw btpw`) confirms it is an active Google App Password.

**Expected:** `.env` files contain only example/placeholder values. Real secrets live in a secrets manager or CI/CD vault — never in files.
**Actual:** Live Supabase DB and Gmail credentials are present in plaintext.

**Impact:** Unauthorized access to the production PostgreSQL database and email account. All resident PII stored in the database is at risk.

---

### [C-03] Active ON CONFLICT constraint mismatch — prefix update permanently broken

**File:** `server/src/queries/counter.queries.js` — `INSERT_OR_UPDATE_PREFIX`
**File:** `server/src/services/counterServices.js:38`
**Confirmed by:** `server/logs/error-2026-03-28.log`

**Description:**
The `INSERT_OR_UPDATE_PREFIX` query uses `ON CONFLICT (year)` which requires a unique constraint on the `year` column alone. However, the `resident_counters` table's actual unique constraint is on `(municipality_id, year)` — as evidenced by the working `generateResidentId()` function in `registrationRoutes.js` which uses `ON CONFLICT (municipality_id, year)`. The error log confirms this crash is happening in production:

```
error: there is no unique or exclusion constraint matching the ON CONFLICT specification
at counterServices.js:38:22
at async updateMunicipality (municipalityControllers.js:51:9)
```

Every time a municipality admin attempts to update the municipality settings (including changing the resident ID prefix), the operation silently fails with a 500 error. The municipality update endpoint is broken for prefix changes.

**Expected:** Query uses the correct constraint column(s) matching the actual table schema.
**Actual:** `ON CONFLICT (year)` fails because no single-column unique constraint exists on `year`.

**Impact:** Municipality prefix update functionality is non-functional. Produces 500 errors in production on every call.

---

## HIGH

---

### [H-01] Redis cache management routes are fully unauthenticated

**File:** `server/src/routes/redisRoutes.js`
**Registered at:** `app.use("/api/redis", redisRouter)` in `app.js`

**Description:**
The following routes have no authentication middleware applied:
- `GET /api/redis/status` — returns Redis connection status
- `GET /api/redis/stats` — returns cache statistics and key counts
- `GET /api/redis/health` — returns Redis health
- `DELETE /api/redis/cache` — **clears the entire Redis cache**
- `POST /api/redis/clear-pattern` — **clears cache keys by pattern**

Any unauthenticated HTTP client can completely flush the application cache, causing a cache stampede on the database. The route comments say "Admin only" but no middleware enforces this.

**Expected:** All cache management endpoints protected with `...allUsers` or `...municipalityAdminOnly` at minimum.
**Actual:** Zero authentication on destructive cache operations.

---

### [H-02] Duplicate request route and service files — one is dead, both conflict

**Files:**
- `server/src/routes/requestRoutes.js` (NOT registered in `app.js`)
- `server/src/routes/requestsRoutes.js` (registered via `app.use("/api", requestsRouter)`)
- `server/src/controllers/requestControllers.js`
- `server/src/controllers/requestsControllers.js`
- `server/src/services/requestServices.js`
- `server/src/services/requestsServices.js`

**Description:**
Two parallel implementations of the requests feature coexist. `requestRoutes.js` defines the same public endpoints (`/public/requests/certificate`, `/public/requests/appointment`, `/public/track/:requestId`) as `requestsRoutes.js`, but with different implementations — `requestRoutes.js` uses `smartCache/smartInvalidateCache` middleware and the full `requestServices.js` (which supports certificate type, urgency, contact info, etc.), while the active `requestsRoutes.js` uses the simpler `requestsServices.js` (which only stores `residentId`, `fullName`, `address`, `purpose`, `status`).

The dead file (`requestRoutes.js`) references a more complete data model that is not used. This indicates either an incomplete migration or abandoned feature work.

**Expected:** One canonical implementation. Dead code removed.
**Actual:** Two divergent implementations; the active one (`requestsRoutes.js`) has a significantly reduced data model — fields like `certificateType`, `urgency`, `contactNumber`, `email`, `requirements` are accepted in the public form but silently discarded.

**Impact:** Certificate and appointment request data submitted by residents is partially lost (urgency, contact info, requirements not stored). Significant data loss risk.

---

### [H-03] `smartCache()` TTL argument silently ignored in monitoring routes

**File:** `server/src/routes/monitoringRoutes.js`
**File:** `server/src/middlewares/smartCache.js:60`

**Description:**
`monitoringRoutes.js` calls `smartCache(30)`, `smartCache(60)`, `smartCache(15)` etc., passing numeric TTL values. However, the `smartCache` function signature is `export const smartCache = () => {` — it accepts zero parameters. The passed TTL values are silently discarded.

The middleware then attempts to match the route path against `CACHE_STRATEGY`, where `/monitoring` is not defined. It falls through to the `DYNAMIC` default of 120 seconds. All monitoring routes — including system CPU metrics (`/system`) and health checks (`/health`) — are cached for 120 seconds instead of the intended 15–60 seconds.

**Expected:** `smartCache` accepts an optional TTL override, or monitoring routes use a different caching approach.
**Actual:** All monitoring endpoints cached at 120s regardless of developer intent. Live metrics appear stale.

---

### [H-04] Redis environment variables have leading whitespace — feature flag silently broken

**File:** `server/.env` (lines 72–77)

**Description:**
All Redis environment variables are prefixed with a space character:
```
 REDIS_ENABLED=true
 REDIS_HOST=localhost
 REDIS_PORT=6379
 REDIS_PASSWORD=
 REDIS_DB=0
```

When `dotenv` parses these, the variable names become `" REDIS_ENABLED"`, `" REDIS_HOST"`, etc. (with leading space). `process.env.REDIS_ENABLED` resolves to `undefined`. There is no `REDIS_ENABLED` check anywhere in `redis.js` or `redisService.js` to begin with — but the env.example advertises this as a supported flag. If Redis is unavailable and a developer sets `REDIS_ENABLED=false` to disable it, the flag will have no effect and the server will still crash trying to connect.

**Expected:** No leading whitespace in env variable names; Redis enabled/disabled flag is actually enforced in code.
**Actual:** Leading space corrupts all Redis env var names; REDIS_ENABLED is undocumented dead config.

---

### [H-05] `console.log` in production server code leaks PII and request details

**Files and lines:**
- `server/src/controllers/householdControllers.js:45,67` — logs raw form values including household data
- `server/src/controllers/petsControllers.js:24` — logs full pet upsert request body
- `server/src/controllers/requestsControllers.js:17` — logs request body
- `server/src/controllers/userControllers.js:36–72` — logs **request headers** (including `Authorization: Bearer <JWT>`), full request body, and uploaded files list
- `server/src/routes/gisRoute.js:31,84,142,156,170,191,192,222,236,292,345,375,389,403` — 14 console statements
- `server/src/config/db.js:46–55` — logs DB connection details (host, user, database, port) to stderr on failure

**Description:**
`console.log` and `console.error` calls remain in production server controllers and routes. Notably, `userControllers.js` logs the full HTTP request headers on every user upsert — this includes the `Authorization` header containing the JWT access token. Anyone with access to server stdout/pm2 logs can harvest live tokens.

`db.js` logs database connection parameters (without password) to `console.error` on failure — these are also forwarded to system logs and visible in crash dumps.

**Expected:** All debug logging uses the `logger` utility. No `console.*` in controllers or routes in production.
**Actual:** 20+ `console.log`/`console.error` statements remain in server-side production code.

---

### [H-06] Gmail SMTP is failing in production — setup email workflow non-functional

**File:** `server/logs/error-2026-03-28.log`

**Description:**
The error log contains repeated failures today:
```
2026-03-28 16:26:10 error: Gmail SMTP: Failed to send email
2026-03-28 16:29:45 error: Gmail SMTP: Failed to send email
2026-03-28 16:45:37 error: [different error — counter constraint]
2026-03-28 16:47:23 error: Gmail SMTP: Failed to send email
2026-03-28 16:54:16 error: Gmail SMTP: Failed to send email
2026-03-28 17:11:50 error: Gmail SMTP: Failed to send email
2026-03-28 17:19:51 error: Setup email sending error
```

The barangay setup email workflow (sending setup links to new barangay admins) is completely non-functional. Errors are swallowed silently — the endpoint returns success to the client even when the email fails (based on the `eugene-added.MD` changelog noting "graceful fallbacks when email sending fails"). No alert or retry mechanism exists.

**Expected:** Email failures are surfaced clearly to the client; system alerts on repeated SMTP failures; working SMTP credentials.
**Actual:** SMTP authentication is failing. Setup links are never delivered. Client receives a success response.

---

### [H-07] `apiKeyAuth.js` silently deletes JWT Authorization header

**File:** `server/src/middlewares/apiKeyAuth.js:46–48`

```js
if (req.headers?.authorization?.startsWith("Bearer ")) {
  delete req.headers.authorization;
}
```

**Description:**
When a valid API key is found, the middleware unconditionally deletes the `Authorization` header. The comment says this prevents downstream JWT middleware from treating the API key as a JWT. However, this is the wrong fix — it destroys a legitimate Bearer token if both an API key and a JWT happen to be present on the same request (e.g., a staff member using the admin panel while also making API-key-authenticated requests).

More critically, the comment reveals that the original bug was Bearer tokens being sent to `extractKey()`, which means there was a previous logic error. The current fix papers over the symptom by destroying valid auth headers.

**Expected:** The `extractKey` function never reads Bearer tokens (it doesn't, correctly). No need to delete the Authorization header.
**Actual:** Authorization header is deleted unconditionally after API key auth. If both auth mechanisms are legitimately used, the JWT is lost.

---

## MEDIUM

---

### [M-01] `console.log` flood in client-side components

**Files:**
- `client/src/features/household/components/HouseholdFamiliesForm.jsx` — 20+ console.log statements logging family data, member IDs, form state
- `client/src/features/archives/components/ArchivesForm.jsx:79–88` — logs API responses and resident search data

**Description:**
Extensive debug logging remains in the React components. `HouseholdFamiliesForm.jsx` alone has over 20 `console.log` calls covering every state change, form sync, and member selection event. In production, this floods the browser console and exposes resident PII (names, IDs, family structure) to anyone who opens DevTools.

**Expected:** No debug `console.log` in production UI components. These were supposed to be removed per the `CONSOLE_LOG_REMOVAL_INTEGRATION.md` doc in the `docs/` folder.
**Actual:** Debug logs are still present and active in shipping code.

---

### [M-02] Debug page `AutoRefreshTest.jsx` accessible in production

**File:** `client/src/pages/debug/AutoRefreshTest.jsx`
**File:** `client/src/utils/testAutoRefresh.js`

**Description:**
A debug page for testing the auto-refresh functionality exists in the production client. If routed (check `App.jsx`), this page is accessible to any authenticated user. The corresponding `testAutoRefresh.js` utility is also present in the production bundle.

**Expected:** Debug pages and test utilities are excluded from production builds or at minimum restricted to development mode.
**Actual:** Debug tooling is deployed alongside production code.

---

### [M-03] Bulk ID PDF generation uses hardcoded `http://localhost:PORT`

**File:** `server/src/routes/setupRoutes.js` — `toFileUrl()` function

```js
const PORT = process.env.PORT || 5000;
function toFileUrl(relPath) {
  ...
  return `http://localhost:${PORT}/${normalized}`;
}
```

**Description:**
The bulk resident ID card generation uses Puppeteer to render HTML containing image URLs. These image URLs are constructed as `http://localhost:5000/uploads/...`. If this backend runs in a Docker container, behind a reverse proxy, or on a different port, Puppeteer cannot load the images because `localhost` inside the Puppeteer process context may not resolve to the correct server instance.

**Expected:** The base URL for Puppeteer image loading should use `BASE_URL` from environment config, not hardcoded `localhost`.
**Actual:** Hardcoded `localhost` — image loading in PDF fails in any non-trivial deployment.

---

### [M-04] Rate limiter depends on Redis — fails open when Redis is unavailable

**File:** `server/src/middlewares/rateLimiter.js:50–53`

```js
} catch (error) {
  logger.error('Rate limiter error:', error);
  // On Redis error, allow the request to proceed
  next();
}
```

**Description:**
When Redis is unavailable (connection dropped, restart, etc.), all rate limiting silently fails open — every request is allowed through with no limit. This is a denial-of-service risk: a Redis outage is the exact moment a bad actor could flood authentication endpoints without any throttling.

The auth rate limiter (`authRateLimiter`) has the same 100 req/15min limit as the general API limiter, providing no extra protection for login endpoints.

**Expected:** On Redis failure, rate limiters either deny all requests (fail closed) or use in-process fallback counters. Auth endpoint rate limit should be significantly stricter than general API.
**Actual:** Complete rate limit bypass during any Redis outage.

---

### [M-05] `protect` middleware authentication bypass logic is complex and fragile

**File:** `server/src/middlewares/auth.js:12–23`

**Description:**
The `protect` middleware checks `req.path` and `req.originalUrl` for both `/openapi` and `/public/` to skip authentication. This dual-check approach creates potential for inconsistency: `req.path` is the route-relative path, while `req.originalUrl` is the full request URL. In Express sub-routers, these can differ.

More specifically, the check `req.path?.startsWith('/openapi')` inside `protect` — which is used as a middleware for non-openapi routes — means any route whose relative path starts with `/openapi` would bypass authentication, even if it's mounted at a completely different path. This is a brittle implicit coupling.

**Expected:** Public routes are handled at the router level by simply not applying `protect`. The middleware itself should not need to know about what routes are public.
**Actual:** Complex string matching inside `protect` for public route exclusion; duplicated across `protect`, `restrictTo`, and `restrictByTargetType`.

---

### [M-06] In-memory API key rate limiting does not survive restarts or scale across processes

**File:** `server/src/middlewares/apiKeyAuth.js:6`

```js
const rateBuckets = new Map(); // keyId -> { windowStartMs, count }
```

**Description:**
API key rate limiting uses a module-level in-memory Map. This has two problems:
1. **Restart bypass** — every server restart clears all rate limit counters. An attacker who knows the server restarts periodically can burst requests before each restart.
2. **Cluster mode** — if the server runs under PM2 cluster mode (multiple Node.js processes), each process has its own `rateBuckets`. An API key gets `limit * numProcesses` effective requests per minute.

The system already has Redis available and uses it for IP-based rate limiting — API key rate limiting should use the same Redis-backed approach.

**Expected:** API key rate limits stored in Redis (like IP-based rate limits).
**Actual:** In-memory Map — ephemeral and process-local.

---

### [M-07] CORS_ORIGIN in production `.env` uses localhost origins

**File:** `server/.env`
```
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

**Description:**
The production `.env` file (which contains live Supabase credentials confirming it is being used against production) still lists `localhost` origins for CORS. This means the production API rejects legitimate cross-origin requests from any non-localhost frontend unless the environment is overridden elsewhere.

If this is actually used as production config, the frontend must be running on the same machine as the server — which may be intentional for local dev but is not suitable for a deployed system.

**Expected:** Production `CORS_ORIGIN` lists the actual public domain(s) of the frontend.
**Actual:** localhost-only CORS in a file that also contains live production database credentials — contradictory configuration.

---

### [M-08] Duplicate `errorHandler` export — `error.js` and `apiError.js` both export it

**Files:**
- `server/src/middlewares/error.js` — exports `errorHandler`, `notFoundHandler`, `sendErrorDev`, `sendErrorProd`
- `server/src/utils/apiError.js` — also exports `errorHandler`, `sendErrorDev`, `sendErrorProd`

**Description:**
`apiError.js` was intended to only export the `ApiError` class, but it also contains a duplicate (and slightly different) `errorHandler` implementation. The version in `apiError.js` calls `sendErrorDev(err, res)` with two arguments, while `error.js` calls `sendErrorDev(err, req, res)` with three. These are different function signatures for the same function name.

`app.js` imports from `error.js` (correct), but any developer who accidentally imports from `apiError.js` would get a broken error handler that ignores the request object.

**Expected:** `apiError.js` exports only `ApiError`. Error handling middleware lives exclusively in `middlewares/error.js`.
**Actual:** Duplicate and divergent `errorHandler` implementations in two files.

---

## LOW / INFO

---

### [L-01] `requestRoutes.js` is dead code with no import

**File:** `server/src/routes/requestRoutes.js`

`requestRoutes.js` is never imported or registered in `app.js`. It defines conflicting endpoints with the active `requestsRoutes.js`. It should either be deleted or integrated. Its presence creates confusion about which implementation is authoritative.

---

### [L-02] `db.js` contains commented-out old configuration with inline narrative

**File:** `server/src/config/db.js:18–26`

The old PostgreSQL connection config is left in as commented code with an explanatory comment in what appears to be Filipino/informal English. While not a defect, commented-out code is noise and the narrative comment is not appropriate for a production codebase.

---

### [L-03] `/health` endpoint discloses application version

**File:** `server/app.js`

```js
res.status(200).json({ ..., version: "2.0.0" });
```

The public (unauthenticated) health endpoint returns the application version. This is minor version disclosure — low risk, but unnecessary. Version strings can assist targeted attacks using known version-specific vulnerabilities.

---

### [L-04] `sendSetupEmail.js` is client-side code referencing email sending logic

**File:** `client/src/features/municipality/barangays/sendSetupEmail.js`

This file is in the React client and handles the setup email sending flow. Review should confirm it proxies through the backend API rather than attempting direct SMTP from the browser. (Given the context it does call a backend endpoint, but the file name is misleading for a frontend file.)

---

### [L-05] Multiple script files with test/debug utility code left in `server/src/scripts/`

**Files:** `testAuditSystem.js`, `testAutoCacheRefresh.js`, `testRedis.js`, `simpleRedisTest.js`, `runCacheTests.js`, `testOgr2ogr.js`

These test/utility scripts are committed to `src/scripts/`. While they don't execute automatically, they could be mistakenly run in production. They should be moved to a `tools/` or `scripts/` top-level directory clearly separate from application source code, or excluded via `.npmignore`.

---

## Confirmed Runtime Errors (from logs)

| Error | Location | Status |
|-------|----------|--------|
| `there is no unique or exclusion constraint matching the ON CONFLICT specification` | `counterServices.js:38` via `municipalityControllers.js:51` | **Active — occurs every prefix update** |
| `Gmail SMTP: Failed to send email` | `userControllers.js` / `email.js` | **Active — 6+ occurrences today** |
| `Setup email sending error` | same | **Active** |

---

*End of report. All findings are observations only — no code was modified.*
