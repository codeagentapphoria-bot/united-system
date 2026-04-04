# Auth Security — In-Memory Token + HttpOnly Refresh Cookie

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage JWT storage with in-memory access token + server-side revocable HttpOnly refresh cookie, and swap the DeveloperPortal API key from localStorage to sessionStorage.

**Architecture:** The access token (JWT, 15 min) lives in a module-level JS variable — never touches storage. A separate opaque refresh token (7 days) is set as an `HttpOnly; Secure; SameSite=None` cookie named `bims_refresh_token`. On page load, the frontend calls `POST /auth/refresh` with `withCredentials: true`; the server validates the cookie, rotates the token, and returns a fresh access token. All existing `Authorization: Bearer` request logic is unchanged.

**Tech Stack:** Node.js/Express backend (ESM), React frontend (Vite), Redis (ioredis via `cacheUtils`), `cookie-parser` (already in `app.js`), Node `crypto` (built-in)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `server/src/config/jwt.js` | Modify | Add `generateRefreshToken()` + `hashRefreshToken()` |
| `server/src/services/auth.js` | Modify | `loginUser` returns refresh token; `refreshToken` takes raw token from cookie; add `logoutUser` |
| `server/src/controllers/auth.js` | Modify | `login` sets cookie; `refreshUserToken` reads cookie; add `logout` |
| `server/src/routes/auth.js` | Modify | Remove `protect` from `/refresh`; add `POST /logout` |
| `client/src/constants/token.js` | Modify | Swap localStorage for module-level variable |
| `client/src/utils/api.js` | Modify | Refresh call uses `withCredentials: true`, no Bearer header |
| `client/src/contexts/AuthContext.jsx` | Modify | `initializeAuth` via cookie; `logout` calls `POST /auth/logout`; `refreshToken` uses `withCredentials` |
| `client/src/pages/public/DeveloperPortal.jsx` | Modify | `localStorage` → `sessionStorage` for API key |

---

## Task 1: Add refresh token helpers to `jwt.js`

**Files:**
- Modify: `server/src/config/jwt.js`

- [ ] **Step 1: Open `server/src/config/jwt.js` and add two helpers after the existing exports**

The file currently ends after `verifyToken`. Add below it:

```js
import crypto from 'crypto';

export const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
```

> Note: `crypto` is a Node built-in — no install needed. The `import` goes at the top of the file alongside the existing `import jwt from 'jsonwebtoken'`.

- [ ] **Step 2: Verify the helpers are importable**

```bash
cd server
node --input-type=module <<'EOF'
import { generateRefreshToken, hashRefreshToken } from './src/config/jwt.js';
const raw = generateRefreshToken();
const hash = hashRefreshToken(raw);
console.log('raw length:', raw.length);   // 64
console.log('hash length:', hash.length); // 64
console.log('different:', raw !== hash);  // true
EOF
```

Expected output:
```
raw length: 64
hash length: 64
different: true
```

- [ ] **Step 3: Commit**

```bash
git add server/src/config/jwt.js
git commit -m "feat(auth): add generateRefreshToken and hashRefreshToken helpers"
```

---

## Task 2: Update `auth.js` service — login, refresh, logout

**Files:**
- Modify: `server/src/services/auth.js`

- [ ] **Step 1: Update the imports at the top of `server/src/services/auth.js`**

Add `generateRefreshToken` and `hashRefreshToken` to the existing import from `../config/jwt.js`:

```js
import { generateToken, generateRefreshToken, hashRefreshToken } from "../config/jwt.js";
```

- [ ] **Step 2: Update `loginUser` to generate and store a refresh token**

Replace the existing `loginUser` return block. The function currently ends with:
```js
  return {
    token,
    user: { ... },
  };
```

Change it to generate and store a refresh token before returning:

```js
  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const SEVEN_DAYS = 7 * 24 * 60 * 60; // seconds
  await cacheUtils.set(`bims:refresh:${refreshHash}`, String(user.id), SEVEN_DAYS);

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      target_type: user.target_type,
      target_id: user.target_id,
      role: user.role,
      name: user.full_name,
      picture_path: user.picture_path,
    },
  };
```

- [ ] **Step 3: Replace the existing `refreshToken` function with a cookie-based version**

The current `refreshToken(userId)` takes a userId from the decoded JWT. Replace the entire function:

```js
export const refreshToken = async (rawToken) => {
  if (!rawToken) throw new ApiError(401, "No refresh token");

  const hash = hashRefreshToken(rawToken);
  const userId = await cacheUtils.get(`bims:refresh:${hash}`);

  if (!userId) throw new ApiError(401, "Refresh token invalid or expired");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, "User no longer exists");

  if (!user.target_id) throw new ApiError(400, "User is missing target_id");

  // Rotate: delete old hash, generate new token + hash
  await cacheUtils.del(`bims:refresh:${hash}`);
  const newRawToken = generateRefreshToken();
  const newHash = hashRefreshToken(newRawToken);
  const SEVEN_DAYS = 7 * 24 * 60 * 60;
  await cacheUtils.set(`bims:refresh:${newHash}`, String(user.id), SEVEN_DAYS);

  const token = generateToken({
    userId: user.id,
    email: user.email,
    target_type: user.target_type,
    target_id: user.target_id,
    role: user.role,
    name: user.full_name,
  });

  return {
    token,
    refreshToken: newRawToken,
    user: {
      id: user.id,
      email: user.email,
      target_type: user.target_type,
      target_id: user.target_id,
      role: user.role,
      name: user.full_name,
      picture_path: user.picture_path,
    },
  };
};
```

- [ ] **Step 4: Add `logoutUser` at the bottom of the file**

```js
export const logoutUser = async (rawToken) => {
  if (!rawToken) return;
  const hash = hashRefreshToken(rawToken);
  await cacheUtils.del(`bims:refresh:${hash}`);
};
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/auth.js
git commit -m "feat(auth): update auth service for cookie-based refresh token rotation"
```

---

## Task 3: Update auth controller — set/clear cookie, add logout

**Files:**
- Modify: `server/src/controllers/auth.js`

- [ ] **Step 1: Update the imports**

Add `logoutUser` to the existing import line:

```js
import { loginUser, forgotPassword, resetPassword, refreshToken, logoutUser } from "../services/auth.js";
```

- [ ] **Step 2: Add the cookie helper constant at the top of the file (below imports)**

```js
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',
};
```

- [ ] **Step 3: Update the `login` controller to set the refresh cookie**

Replace the entire `login` function:

```js
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, refreshToken: rawRefresh, user } = await loginUser(email, password);

    res.cookie('bims_refresh_token', rawRefresh, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      status: "success",
      token,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 4: Replace `refreshUserToken` to read from cookie**

The current version reads `req.user.id` from the `protect` middleware. Replace entirely:

```js
export const refreshUserToken = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.bims_refresh_token;
    if (!rawToken) {
      return res.status(401).json({ status: "error", message: "No refresh token" });
    }

    const { token, refreshToken: newRawRefresh, user } = await refreshToken(rawToken);

    res.cookie('bims_refresh_token', newRawRefresh, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      status: "success",
      token,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 5: Add the `logout` controller at the bottom of the file**

```js
export const logout = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.bims_refresh_token;
    await logoutUser(rawToken);

    res.clearCookie('bims_refresh_token', {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 0,
    });

    res.status(200).json({ status: "success", message: "Logged out" });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/auth.js
git commit -m "feat(auth): set HttpOnly refresh cookie on login, add logout controller"
```

---

## Task 4: Update auth routes

**Files:**
- Modify: `server/src/routes/auth.js`

- [ ] **Step 1: Update the entire file**

The current file imports `protect` and uses it on `/refresh`. Remove `protect` from `/refresh` and add the `logout` route:

```js
import express from "express";
import {
  login,
  requestPasswordReset,
  resetPasswordWithCode,
  refreshUserToken,
  logout,
} from "../controllers/auth.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPasswordWithCode);
router.post("/refresh", refreshUserToken);
router.post("/logout", logout);

router.get("/me", protect, (req, res) => {
  res.status(200).json({
    status: "success",
    data: { user: req.user },
  });
});

export default router;
```

- [ ] **Step 2: Manually verify the backend endpoints**

Start the server:
```bash
cd server && npm run dev
```

Test login sets a cookie:
```bash
curl -s -c /tmp/bims_cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | jq .
```

Expected: `{ "status": "success", "token": "eyJ...", "data": { "user": {...} } }`

Check the cookie was set:
```bash
grep bims_refresh_token /tmp/bims_cookies.txt
```

Expected: a line containing `bims_refresh_token` with a 64-char hex value.

Test refresh uses the cookie:
```bash
curl -s -b /tmp/bims_cookies.txt -c /tmp/bims_cookies.txt \
  -X POST http://localhost:5000/api/auth/refresh | jq .
```

Expected: `{ "status": "success", "token": "eyJ..." }` with a NEW cookie being set.

Test logout clears the cookie:
```bash
curl -s -b /tmp/bims_cookies.txt -c /tmp/bims_cookies.txt \
  -X POST http://localhost:5000/api/auth/logout | jq .
```

Expected: `{ "status": "success", "message": "Logged out" }`

Verify refresh after logout returns 401:
```bash
curl -s -b /tmp/bims_cookies.txt \
  -X POST http://localhost:5000/api/auth/refresh | jq .
```

Expected: `{ "status": "error", "message": "..." }` with HTTP 401.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/auth.js
git commit -m "feat(auth): remove protect from /refresh route, add /logout route"
```

---

## Task 5: Swap localStorage for module-level variable in `token.js`

**Files:**
- Modify: `client/src/constants/token.js`

- [ ] **Step 1: Replace the entire file contents**

```js
let _token = null;

export const setToken = (token) => {
  _token = token;
};

export const getToken = () => _token;

export const removeToken = () => {
  _token = null;
};

export const decodeToken = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    return payload;
  } catch (error) {
    return null;
  }
};

export const getRoleFromToken = () => {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.target_type || null;
};

export const getPermissionLevelFromToken = () => {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.role || null;
};
```

> `api.js`, `AuthContext.jsx`, and every other file that imports from `token.js` call the same exported names (`setToken`, `getToken`, `removeToken`, `decodeToken`, `getRoleFromToken`, `getPermissionLevelFromToken`) — no changes needed in those files' imports.

- [ ] **Step 2: Verify no localStorage references remain in token.js**

```bash
grep -n "localStorage" client/src/constants/token.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add client/src/constants/token.js
git commit -m "feat(auth): store access token in memory instead of localStorage"
```

---

## Task 6: Update `api.js` — refresh call uses withCredentials, no Bearer

**Files:**
- Modify: `client/src/utils/api.js`

- [ ] **Step 1: Update the `refreshToken` function**

Find the current `refreshToken` function (lines 25–43). The current version reads `getToken()` and sends it as `Authorization: Bearer`. Replace the entire function:

```js
const refreshToken = async () => {
  try {
    const { data } = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      {},
      { withCredentials: true }
    );

    if (data.status === "success") {
      setToken(data.token);
      return data.token;
    }
    return null;
  } catch (err) {
    logger.warn("Token refresh failed:", err.message);
    return null;
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/utils/api.js
git commit -m "feat(auth): refresh call uses withCredentials instead of Bearer token"
```

---

## Task 7: Update `AuthContext.jsx` — init via cookie, logout calls server

**Files:**
- Modify: `client/src/contexts/AuthContext.jsx`

- [ ] **Step 1: Update `initializeAuth`**

Find `initializeAuth` (currently starts at line 138). Replace the entire function:

```js
const initializeAuth = async () => {
  try {
    // Silently exchange the HttpOnly cookie for a fresh access token
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/auth/refresh`,
      {},
      { withCredentials: true }
    );

    if (data.status === "success") {
      setToken(data.token);
      setState({
        user: data.data.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        isSetup: false,
        barangayData: null,
        isInitialized: true,
        setupLoading: true,
      });
      updateSetupStatus(data.data.user);
    } else {
      setState((prev) => ({ ...prev, loading: false, isInitialized: true }));
    }
  } catch {
    // No cookie or expired — user needs to log in
    setState({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      isSetup: false,
      barangayData: null,
      isInitialized: true,
      setupLoading: false,
    });
  }
};
```

> Add `import axios from "axios";` at the top of `AuthContext.jsx` if it is not already imported. Check the current imports — `api` is imported from `@/utils/api` but that instance doesn't have `withCredentials` set globally. We use raw `axios` for the refresh call so `withCredentials` is explicit.

- [ ] **Step 2: Update `refreshToken` in AuthContext**

Find the `refreshToken` function (currently lines 118–136). Replace it:

```js
const refreshToken = async () => {
  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/auth/refresh`,
      {},
      { withCredentials: true }
    );

    if (data.status === "success") {
      setToken(data.token);
      return data.token;
    }
    return null;
  } catch (err) {
    logger.warn("Token refresh failed:", err.message);
    return null;
  }
};
```

- [ ] **Step 3: Update `logout` to call the server**

Find the `logout` function (currently lines 243–259). Replace it:

```js
const logout = async () => {
  try {
    await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/auth/logout`,
      {},
      { withCredentials: true }
    );
  } catch {
    // Best-effort — clear local state regardless
  }
  removeToken();
  setState({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    isSetup: false,
    barangayData: null,
    isInitialized: true,
    setupLoading: false,
  });
  toast({
    title: "Logged Out",
    description: "You have been successfully logged out.",
  });
};
```

> `logout` is now `async`. Check all call sites — if any call `logout()` without `await`, that is fine (fire-and-forget is acceptable for logout).

- [ ] **Step 4: Verify axios is imported**

```bash
grep "^import axios" client/src/contexts/AuthContext.jsx
```

If no output, add this line at the top of the file alongside the other imports:
```js
import axios from "axios";
```

- [ ] **Step 5: Commit**

```bash
git add client/src/contexts/AuthContext.jsx
git commit -m "feat(auth): init auth from HttpOnly cookie, logout invalidates server-side token"
```

---

## Task 8: Swap DeveloperPortal API key to sessionStorage

**Files:**
- Modify: `client/src/pages/public/DeveloperPortal.jsx`

- [ ] **Step 1: Replace the two localStorage calls**

Find line 177 (the `useEffect` that reads the saved key) and line 183 (the `saveKey` function that writes it).

Change:
```js
const saved = localStorage.getItem("devPortalApiKey");
```
To:
```js
const saved = sessionStorage.getItem("devPortalApiKey");
```

Change:
```js
localStorage.setItem("devPortalApiKey", apiKey);
```
To:
```js
sessionStorage.setItem("devPortalApiKey", apiKey);
```

- [ ] **Step 2: Verify no localStorage references remain in DeveloperPortal**

```bash
grep -n "localStorage" client/src/pages/public/DeveloperPortal.jsx
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/public/DeveloperPortal.jsx
git commit -m "fix(security): move DeveloperPortal API key from localStorage to sessionStorage"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Start both frontend and backend**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

- [ ] **Step 2: Verify localStorage is clean after login**

1. Open the app in Chrome at `http://localhost:5173`
2. Open DevTools → Application → Local Storage → `http://localhost:5173`
3. Log in with valid credentials
4. Confirm `access_token` does NOT appear in localStorage
5. Switch to Application → Cookies → `http://localhost:5173` — confirm no `bims_refresh_token` visible here (it's HttpOnly, set on the backend domain)
6. Check Application → Cookies → `http://localhost:5000` — confirm `bims_refresh_token` appears with `HttpOnly` checked

- [ ] **Step 3: Verify session survives page refresh**

1. While logged in, press F5 (hard reload)
2. App should re-authenticate silently and land on the dashboard — no login screen
3. In the Network tab, confirm a `POST /api/auth/refresh` request was made on load and returned 200

- [ ] **Step 4: Verify logout invalidates the server-side token**

1. While logged in, open DevTools → Network
2. Click Logout
3. Confirm `POST /api/auth/logout` returned 200
4. Press F5 — app should redirect to login screen (refresh token is gone from Redis)
5. Confirm `bims_refresh_token` cookie is cleared (MaxAge=0 clears it)

- [ ] **Step 5: Verify DeveloperPortal API key uses sessionStorage**

1. Navigate to the Developer Portal page
2. Paste an API key and click Save
3. Open DevTools → Application → Local Storage — confirm `devPortalApiKey` is NOT there
4. Open DevTools → Application → Session Storage — confirm `devPortalApiKey` IS there
5. Close the tab and reopen — API key should be gone (sessionStorage is tab-scoped)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: end-to-end auth security verified — localStorage JWT eliminated"
```

---

## Environment Notes

**No new env vars needed.** The cookie `secure` flag is driven by `NODE_ENV`:
- Development (Railway/Vercel local): `NODE_ENV` is not `production` → `Secure: false, SameSite: lax`
- Production (Railway): set `NODE_ENV=production` → `Secure: true, SameSite: none`

Confirm `NODE_ENV=production` is set in your Railway backend environment variables if not already.
