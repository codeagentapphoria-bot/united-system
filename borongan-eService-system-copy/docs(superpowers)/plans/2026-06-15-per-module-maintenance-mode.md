# Per-Module Maintenance Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-module maintenance mode so admin portal, citizen portal, and API routes can each be independently locked down via env vars, with a branded 503 page shown to users.

**Architecture:**
- **Backend** (`multysis-backend`): Express middleware mounted as the first middleware. Reads `MAINTENANCE_ADMIN`, `MAINTENANCE_PORTAL`, `MAINTENANCE_API` env vars. When active, returns HTTP 503 with inline branded HTML page.
- **Frontend admin** (`multysis-frontend`): `App.tsx` checks `VITE_MAINTENANCE_ADMIN` on mount. If true, renders `<MaintenanceOverlay />` bypassing all routes.
- **Frontend portal** (`multysis-frontend`): Same pattern, checks `VITE_MAINTENANCE_PORTAL`.
- **Programs portal** (`borongan-programs-portal`): Separate config with `VITE_MAINTENANCE_MODE`. Own overlay component.

**Tech Stack:** Express middleware, React, Vite build-time env vars, inline CSS (no external deps).

---

## File Map

| File | Responsibility |
|---|---|
| `multysis-backend/src/middleware/maintenance.ts` | New — Express middleware that checks env vars and returns 503 + HTML |
| `multysis-backend/src/index.ts` | Mount middleware first, before all routes |
| `multysis-backend/.env.example` | Add `MAINTENANCE_ADMIN`, `MAINTENANCE_PORTAL`, `MAINTENANCE_API`, `MAINTENANCE_MESSAGE` |
| `multysis-frontend/src/components/MaintenanceOverlay.tsx` | New — branded overlay UI component |
| `multysis-frontend/src/App.tsx` | Conditionally render overlay for admin or portal |
| `multysis-frontend/.env.example` | Add `VITE_MAINTENANCE_ADMIN`, `VITE_MAINTENANCE_PORTAL`, `VITE_MAINTENANCE_MESSAGE` |
| `borongan-programs-portal/src/components/MaintenanceOverlay.tsx` | New — own overlay for programs portal |
| `borongan-programs-portal/src/App.tsx` | Check `VITE_MAINTENANCE_MODE`, render overlay |
| `borongan-programs-portal/.env.example` | Add `VITE_MAINTENANCE_MODE`, `VITE_MAINTENANCE_MESSAGE` |

---

## Task 1: Backend — Maintenance Middleware

**Files:**
- Create: `borongan-eService-system-copy/multysis-backend/src/middleware/maintenance.ts`

- [ ] **Step 1: Create maintenance middleware**

Create `borongan-eService-system-copy/multysis-backend/src/middleware/maintenance.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

interface MaintenanceConfig {
  admin: boolean;
  portal: boolean;
  api: boolean;
  message: string;
}

function getConfig(): MaintenanceConfig {
  return {
    admin: process.env.MAINTENANCE_ADMIN === 'true',
    portal: process.env.MAINTENANCE_PORTAL === 'true',
    api: process.env.MAINTENANCE_API === 'true',
    message: process.env.MAINTENANCE_MESSAGE || 'This section is under maintenance. Please try again later.',
  };
}

function buildHtmlPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Under Maintenance</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 480px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      color: #eab308;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.75rem;
    }
    p {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .status {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#9888;</div>
    <h1>Under Maintenance</h1>
    <p>${message}</p>
    <span class="status">503 Service Unavailable</span>
  </div>
</body>
</html>`;
}

export const maintenanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const config = getConfig();

  const path = req.path;

  // Normalize path: remove leading /api prefix for module detection
  const normalized = path.startsWith('/api/') ? path.slice(4) : path;

  let isBlocked = false;
  if (normalized.startsWith('admin/') && config.admin) isBlocked = true;
  if (normalized.startsWith('portal/') && config.portal) isBlocked = true;
  if (!normalized.startsWith('admin/') && !normalized.startsWith('portal/') && config.api) isBlocked = true;

  if (isBlocked) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Retry-After', '3600');
    res.status(503).send(buildHtmlPage(config.message));
    return;
  }

  next();
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd borongan-eService-system-copy/multysis-backend && npm.cmd run build`
Expected: Build succeeds (middleware is pure TypeScript, no runtime effect)

- [ ] **Step 3: Commit**

```bash
git add borongan-eService-system-copy/multysis-backend/src/middleware/maintenance.ts
git commit -m "feat(backend): add per-module maintenance middleware"
```

---

## Task 2: Backend — Mount Middleware

**Files:**
- Modify: `borongan-eService-system-copy/multysis-backend/src/index.ts` — add import and mount first

- [ ] **Step 1: Read the imports section of index.ts to find the right insertion point**

Read lines 1-30 of `borongan-eService-system-copy/multysis-backend/src/index.ts`. Find where other middleware imports are (e.g., `sessionTimeout`, `audit`, `error`).

- [ ] **Step 2: Add import**

Add after the existing middleware imports (around line 150-170):
```typescript
import { maintenanceMiddleware } from './middleware/maintenance';
```

- [ ] **Step 3: Mount middleware first**

Find the first `app.use(` call in `index.ts` (around the route registration area — after all the other middleware like `rateLimiter` but before route mounting). The maintenance middleware must come **before** all route handlers.

Add this as the first `app.use()` call, before the auth routes:
```typescript
// Maintenance mode — must be first to catch all routes
app.use(maintenanceMiddleware);

app.use('/api/auth', authRoutes);
```

Make sure it is placed BEFORE `app.use('/api/auth', authRoutes);` on line 397.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd borongan-eService-system-copy/multysis-backend && npm.cmd run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add borongan-eService-system-copy/multysis-backend/src/index.ts
git commit -m "feat(backend): mount maintenance middleware first in Express stack"
```

---

## Task 3: Backend — Update .env.example

**Files:**
- Modify: `borongan-eService-system-copy/multysis-backend/.env.example`

- [ ] **Step 1: Read current .env.example**

Read the full file to find the right place to insert (typically at the end or in a logical section).

- [ ] **Step 2: Append maintenance env vars**

Add to the end of `.env.example`:

```env
# ─── Maintenance Mode ─────────────────────────────────────────────────────────────
# Set any of these to 'true' to block that module with a 503 branded page.
# Requires backend restart to take effect. Rebuild frontend to pick up new values.
MAINTENANCE_ADMIN=false
MAINTENANCE_PORTAL=false
MAINTENANCE_API=false
MAINTENANCE_MESSAGE=This section is under maintenance. Please try again later.
```

- [ ] **Step 3: Commit**

```bash
git add borongan-eService-system-copy/multysis-backend/.env.example
git commit -m "chore(backend): add MAINTENANCE_* env vars to .env.example"
```

---

## Task 4: multysis-frontend — MaintenanceOverlay Component

**Files:**
- Create: `borongan-eService-system-copy/multysis-frontend/src/components/MaintenanceOverlay.tsx`

- [ ] **Step 1: Create MaintenanceOverlay component**

Create `borongan-eService-system-copy/multysis-frontend/src/components/MaintenanceOverlay.tsx`:

```tsx
import React from 'react';

interface MaintenanceOverlayProps {
  message?: string;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  message,
}) => {
  const displayMessage =
    message ||
    (import.meta.env.VITE_MAINTENANCE_MESSAGE as string) ||
    'This section is under maintenance. Please try again later.';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="text-center px-6 max-w-md">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center">
            <span className="text-4xl text-yellow-500">&#9888;</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Under Maintenance
        </h1>

        {/* Message */}
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {displayMessage}
        </p>

        {/* Status badge */}
        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
          503 Service Unavailable
        </span>

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-400">
          If you believe this is an error, please contact the administrator.
        </p>
      </div>
    </div>
  );
};
```

Note: Uses Tailwind classes (`bg-yellow-50`, `text-yellow-500`, etc.) — verify these match the shadcn/Tailwind setup in the project. If the project uses a different utility class pattern, adjust accordingly.

- [ ] **Step 2: Verify no diagnostics**

Run LSP diagnostics on the new file.

- [ ] **Step 3: Commit**

```bash
git add borongan-eService-system-copy/multysis-frontend/src/components/MaintenanceOverlay.tsx
git commit -m "feat(frontend): add MaintenanceOverlay component"
```

---

## Task 5: multysis-frontend — Wire into App.tsx

**Files:**
- Modify: `borongan-eService-system-copy/multysis-frontend/src/App.tsx`

- [ ] **Step 1: Modify App.tsx**

Replace the current `App.tsx` content with:

```tsx
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginSheetProvider } from './context/LoginSheetContext';
import { SocketProvider } from './context/SocketContext';
import { LibreSakayBadgeProvider } from './context/LibreSakayBadgeContext';
import { CityPopulationBadgeProvider } from './context/CityPopulationBadgeContext';
import { router } from './routes';
import { queryClient } from './lib/query-client';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';

const MAINTENANCE_ADMIN =
  import.meta.env.VITE_MAINTENANCE_ADMIN === 'true';
const MAINTENANCE_PORTAL =
  import.meta.env.VITE_MAINTENANCE_PORTAL === 'true';
const MAINTENANCE_MESSAGE = import.meta.env
  .VITE_MAINTENANCE_MESSAGE as string | undefined;

interface AppProps {}

export const App: React.FC<AppProps> = () => {
  const isMaintenanceAdmin =
    import.meta.env.VITE_MAINTENANCE_ADMIN === 'true';
  const isMaintenancePortal =
    import.meta.env.VITE_MAINTENANCE_PORTAL === 'true';

  if (isMaintenanceAdmin || isMaintenancePortal) {
    return (
      <MaintenanceOverlay message={MAINTENANCE_MESSAGE} />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <LoginSheetProvider>
            <LibreSakayBadgeProvider>
              <CityPopulationBadgeProvider>
                <RouterProvider router={router} />
                <Toaster />
              </CityPopulationBadgeProvider>
            </LibreSakayBadgeProvider>
          </LoginSheetProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
```

**Note on how it works:** The `import.meta.env` values are baked in at **build time**. For `MAINTENANCE_ADMIN` to block only the admin section, the frontend would need a separate build for admin vs portal — or the overlay blocks the whole app. If you want per-route blocking at runtime, you would instead check the route in a layout component or use a React context that reads from a `/api/maintenance-status` endpoint. For this build-time approach, both `MAINTENANCE_ADMIN` and `MAINTENANCE_PORTAL` flags together cover the full frontend. Consider setting both to the same value in practice, or clarify with the user if they want separate frontend builds per module.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd borongan-eService-system-copy/multysis-frontend && npm.cmd run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add borongan-eService-system-copy/multysis-frontend/src/App.tsx
git commit -m "feat(frontend): wire MaintenanceOverlay into App root"
```

---

## Task 6: multysis-frontend — Update .env.example

**Files:**
- Modify: `borongan-eService-system-copy/multysis-frontend/.env.example`

- [ ] **Step 1: Read current .env.example**

Read the full file to find the right place to insert.

- [ ] **Step 2: Append maintenance env vars**

Add to the end:

```env
# ─── Maintenance Mode ─────────────────────────────────────────────────────────────
# Set to 'true' to show the maintenance overlay for that section.
# Requires a frontend rebuild to take effect.
VITE_MAINTENANCE_ADMIN=false
VITE_MAINTENANCE_PORTAL=false
VITE_MAINTENANCE_MESSAGE=This section is under maintenance. Please try again later.
```

- [ ] **Step 3: Commit**

```bash
git add borongan-eService-system-copy/multysis-frontend/.env.example
git commit -m "chore(frontend): add VITE_MAINTENANCE_* env vars to .env.example"
```

---

## Task 7: borongan-programs-portal — MaintenanceOverlay Component

**Files:**
- Create: `borongan-programs-portal/src/components/MaintenanceOverlay.tsx`

- [ ] **Step 1: Create MaintenanceOverlay component**

Create `borongan-programs-portal/src/components/MaintenanceOverlay.tsx`:

```tsx
import React from 'react';

interface MaintenanceOverlayProps {
  message?: string;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  message,
}) => {
  const displayMessage =
    message ||
    (import.meta.env.VITE_MAINTENANCE_MESSAGE as string) ||
    'This portal is under maintenance. Please try again later.';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="text-center px-6 max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center">
            <span className="text-4xl text-yellow-500">&#9888;</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Under Maintenance
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {displayMessage}
        </p>
        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
          503 Service Unavailable
        </span>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify no diagnostics**

Run LSP diagnostics on the new file.

- [ ] **Step 3: Commit**

```bash
git add borongan-programs-portal/src/components/MaintenanceOverlay.tsx
git commit -m "feat(programs-portal): add MaintenanceOverlay component"
```

---

## Task 8: borongan-programs-portal — Wire into App.tsx

**Files:**
- Modify: `borongan-programs-portal/src/App.tsx`

- [ ] **Step 1: Modify App.tsx**

Replace `borongan-programs-portal/src/App.tsx` with:

```tsx
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes';
import { queryClient } from './lib/query-client';
import { Toaster } from './components/ui/toaster';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';

const MAINTENANCE_MODE =
  import.meta.env.VITE_MAINTENANCE_MODE === 'true';
const MAINTENANCE_MESSAGE = import.meta.env
  .VITE_MAINTENANCE_MESSAGE as string | undefined;

export const App: React.FC = () => {
  if (MAINTENANCE_MODE) {
    return (
      <MaintenanceOverlay message={MAINTENANCE_MESSAGE} />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd borongan-programs-portal && npm.cmd run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add borongan-programs-portal/src/App.tsx
git commit -m "feat(programs-portal): wire MaintenanceOverlay into App root"
```

---

## Task 9: borongan-programs-portal — Update .env.example

**Files:**
- Modify: `borongan-programs-portal/.env.example`

- [ ] **Step 1: Read current .env.example**

Read lines 10-14 (after the existing content) to find the insertion point.

- [ ] **Step 2: Append maintenance env vars**

Add to the end:

```env
# ─── Maintenance Mode ─────────────────────────────────────────────────────────────
# Set to 'true' to show the maintenance overlay.
# Requires a frontend rebuild to take effect.
VITE_MAINTENANCE_MODE=false
VITE_MAINTENANCE_MESSAGE=This portal is under maintenance. Please try again later.
```

- [ ] **Step 3: Commit**

```bash
git add borongan-programs-portal/.env.example
git commit -m "chore(programs-portal): add VITE_MAINTENANCE_* env vars to .env.example"
```

---

## Verification

After all tasks, run the following to confirm everything compiles:

```bash
# Backend
cd borongan-eService-system-copy/multysis-backend && npm.cmd run build

# Frontend
cd borongan-eService-system-copy/multysis-frontend && npm.cmd run build

# Programs portal
cd borongan-programs-portal && npm.cmd run build
```

All three should exit with code 0.

---

## Usage

**To lock down the admin portal:**
1. Backend: set `MAINTENANCE_ADMIN=true` in `.env`, restart backend
2. Frontend: set `VITE_MAINTENANCE_ADMIN=true` in `.env`, rebuild frontend

**To lock down the citizen portal:**
1. Backend: set `MAINTENANCE_PORTAL=true` in `.env`, restart backend
2. Frontend: set `VITE_MAINTENANCE_PORTAL=true` in `.env`, rebuild frontend

**To lock down all API routes:**
1. Backend: set `MAINTENANCE_API=true` in `.env`, restart backend

**Programs portal:**
1. Set `VITE_MAINTENANCE_MODE=true` in programs portal `.env`, rebuild
