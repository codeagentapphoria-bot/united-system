# Auth Security — In-Memory Access Token + HttpOnly Refresh Cookie

**Date:** 2026-03-30
**Scope:** BIMS admin auth only (barangay-information-management-system-copy)
**Priority:** High — replaces localStorage JWT storage

---

## Problem

BIMS stores the admin JWT access token in `localStorage`. Any XSS payload can read `localStorage.getItem("access_token")` and steal the session. The developer portal also persists the API key in `localStorage` unnecessarily.

---

## Solution Overview

Two-token auth pattern:

| Token | Type | Storage | Lifetime |
|---|---|---|---|
| Access token | JWT | Module-level JS variable (memory) | 15 min |
| Refresh token | Opaque 32-byte hex | `HttpOnly` cookie (`bims_refresh_token`) | 7 days |

The access token never touches `localStorage`, `sessionStorage`, or a readable cookie. XSS cannot steal it. The refresh token lives in an `HttpOnly` cookie — unreadable by JavaScript. On page load, the frontend silently exchanges the cookie for a fresh access token. The user stays logged in across refreshes with no UX change.

---

## Deployment Context

- Frontend: Vercel (`*.vercel.app`)
- Backend: Railway (`*.railway.app`)
- Separate domains — requires `SameSite=None; Secure` in production
- CORS already configured with `credentials: true` and origin whitelist

**CSRF mitigation:** The existing CORS origin whitelist blocks unauthorized cross-origin credentialed requests. No additional CSRF token needed.

---

## Cross-System Compatibility

The E-Services portal (`borongan-eService-system-copy`) calls BIMS backend at `/api/portal/household/*` using E-Services resident JWTs via `Authorization: Bearer` header. This route uses a separate `verifyPortalResident` middleware and is completely unaffected by this change.

E-Services already uses HttpOnly cookies for its own auth — this design brings BIMS to the same standard.

---

## Cookie Configuration

```js
const isProduction = process.env.NODE_ENV === 'production';
res.cookie('bims_refresh_token', rawToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',                 // scoped to auth routes only
});
```

Cookie is named `bims_refresh_token` (not `access_token` or `refresh_token`) to avoid namespace collision with E-Services portal token cookies.

---

## Redis Storage

Refresh tokens are stored server-side for revocation support (logout kills the token immediately).

- **Key:** `bims:refresh:<sha256_hash_of_raw_token>`
- **Value:** `userId`
- **TTL:** 7 days

The raw token only ever exists in the cookie. The server stores only the SHA-256 hash. Even if Redis is compromised, raw tokens are not exposed.

**Redis-disabled fallback:** If `REDIS_ENABLED=false`, `cacheUtils` is a no-op — refresh token storage and hash validation are skipped. Users fall back to re-login on page refresh. The in-memory access token still works for the tab's lifetime.

---

## Token Rotation

On every `/auth/refresh` call:
1. Read `bims_refresh_token` cookie
2. SHA-256 hash it, look up in Redis
3. Delete old hash from Redis
4. Generate new raw token, store new hash in Redis
5. Set new `bims_refresh_token` cookie
6. Return new access token in JSON body

This prevents refresh token replay attacks — a used token is immediately invalidated.

---

## Backend Changes

### `src/config/jwt.js`
Add two helpers:
- `generateRefreshToken()` — `crypto.randomBytes(32).toString('hex')`
- `hashRefreshToken(token)` — `crypto.createHash('sha256').update(token).digest('hex')`

### `src/services/auth.js`
- `loginUser`: after generating the access token, also call `generateRefreshToken()`, store hash in Redis, return raw refresh token alongside access token + user
- `refreshToken(rawToken)`: takes raw token from cookie (not userId from JWT); SHA-256 hashes it; validates against Redis; rotates (delete old, generate new); returns new access token + user + new raw refresh token
- `logoutUser(rawToken)`: SHA-256 hashes raw token; deletes from Redis

### `src/controllers/auth.js`
- `login`: receives `{ token, refreshToken, user }` from service; sets `bims_refresh_token` cookie; returns `{ token, user }` in JSON body (refresh token never in JSON)
- `refreshUserToken`: reads `req.cookies.bims_refresh_token`; returns 401 if missing; calls `refreshToken(rawToken)` from service; sets new cookie; returns new access token in JSON
- `logout` (new): reads `req.cookies.bims_refresh_token`; calls `logoutUser`; clears cookie with `Max-Age=0`; returns 200

### `src/routes/auth.js`
- `POST /refresh` — remove `protect` middleware (auth is the cookie itself)
- `POST /logout` (new) — no auth middleware needed (cookie is the credential)

---

## Frontend Changes

### `src/constants/token.js`
Replace `localStorage` operations with a module-level variable:

```js
let _token = null;

export const setToken = (token) => { _token = token; };
export const getToken = () => _token;
export const removeToken = () => { _token = null; };
// decodeToken, getRoleFromToken, getPermissionLevelFromToken — unchanged
```

`api.js` and `AuthContext.jsx` call the same function signatures — no changes to their import/usage.

### `src/contexts/AuthContext.jsx`
- `initializeAuth()`: remove `getToken()` localStorage read; instead call `POST /api/auth/refresh` with `withCredentials: true`; if it returns a token, store in memory and fetch `/auth/me`; if it fails (no cookie / expired), set unauthenticated state
- `login()`: unchanged — still calls `setToken(data.token)`, which now writes to memory
- `logout()`: call `POST /api/auth/logout` with `withCredentials: true` before calling `removeToken()` and resetting state
- `refreshToken()`: remove `getToken()` read; call `/auth/refresh` with `withCredentials: true`; store returned token via `setToken()`

### `src/utils/api.js`
- `refreshToken()` function: remove `getToken()` read and `Authorization` header; add `withCredentials: true` to the axios call
- Response interceptor `refreshToken` call: same — `withCredentials: true`, no Bearer header

### `src/pages/public/DeveloperPortal.jsx`
- `localStorage.getItem("devPortalApiKey")` → `sessionStorage.getItem("devPortalApiKey")`
- `localStorage.setItem("devPortalApiKey", apiKey)` → `sessionStorage.setItem("devPortalApiKey", apiKey)`

---

## Data Flow

```
LOGIN
  Browser → POST /auth/login { email, password }
  Server  → 200 { token: <access_jwt>, user: {...} }
          + Set-Cookie: bims_refresh_token=<raw>; HttpOnly; Secure; SameSite=None; Path=/api/auth
  Frontend → setToken(<access_jwt>) → stored in module variable

PAGE LOAD / TAB REFRESH
  Browser → POST /auth/refresh (withCredentials: true, cookie sent automatically)
  Server  → validates hash, rotates token
          → 200 { token: <new_access_jwt>, user: {...} }
          + Set-Cookie: bims_refresh_token=<new_raw>; ...
  Frontend → setToken(<new_access_jwt>)

AUTHENTICATED REQUEST
  Browser → GET /api/... { Authorization: Bearer <access_jwt> }  (unchanged)
  Server  → protect middleware validates JWT  (unchanged)

ACCESS TOKEN EXPIRES (401)
  api.js interceptor → POST /auth/refresh (withCredentials: true)
  Server  → rotates, returns new access token
  Interceptor → retries original request with new token

LOGOUT
  Browser → POST /auth/logout (withCredentials: true)
  Server  → deletes hash from Redis
          + Set-Cookie: bims_refresh_token=; Max-Age=0
  Frontend → removeToken(), reset state
```

---

## Out of Scope

- E-Services auth (already uses HttpOnly cookies)
- BIMS Open API key management (uses `x-api-key` header, separate middleware)
- Password reset flow (no token storage involved)
- Adding CSP headers (separate task, lower priority)
