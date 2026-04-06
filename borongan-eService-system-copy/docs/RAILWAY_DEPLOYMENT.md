# E-Services Railway Deployment Guide

This guide covers deploying the Borongan E-Service System on Railway using Docker with proc-compose as the multi-process entrypoint.

## How It Works

The Dockerfile builds a single container that runs three processes via proc-compose:

```
Docker container ($PORT)
  proc-compose up -f proc-compose.prod.yml --no-color
    redis-server        ← in-container cache (port 6379)
    npm run preview     ← Vite static server (port 4173)
    npm run start       ← Node.js/TypeScript backend (port 3000)
    merge-port          ← reverse proxy on $PORT (auto-injected)
```

- `merge-port` binds to Railway's `$PORT` automatically (no config needed)
- Backend waits for Redis to be ready before starting (`depends_on` + `ready_when`)
- Socket.io traffic is routed to the backend via the `/socket.io` api prefix
- If the backend crashes, proc-compose retries up to 10 times then exits non-zero, triggering a Railway container restart

## Prerequisites

- Railway account with a project created
- GitHub repo connected to Railway
- PostgreSQL database provisioned (Supabase unified DB or Railway add-on)

## Environment Variables

Set these in Railway's **Variables** tab before the first deploy.

### Required

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgres://...` | Supabase pooled connection (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | `postgres://...` | Supabase direct connection (port 5432) |
| `JWT_SECRET` | `***` | Long random string, must match BIMS |
| `NODE_ENV` | `production` | |
| `NO_COLOR` | `1` | Clean logs in Railway log viewer |
| `VITE_API_BASE_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}/api` | Baked into frontend at build time, must be HTTPS |

### Backend

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `3000` | Already set in proc-compose.prod.yml |
| `API_BASE_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Used by backend for generating URLs |
| `CORS_ORIGIN` | `https://bims.up.railway.app` | BIMS Railway URL (cross-system access) |
| `PORTAL_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Public portal URL |
| `ACCESS_TOKEN_EXPIRES` | `10m` | |
| `REFRESH_TOKEN_EXPIRES` | `30d` | |
| `IDLE_TIMEOUT` | `15m` | |
| `ABSOLUTE_TIMEOUT` | `6h` | |
| `COOKIE_SECURE` | `true` | Required for HTTPS |
| `COOKIE_SAME_SITE` | `strict` | |

### Email (SMTP)

| Variable | Value | Notes |
|----------|-------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `587` | |
| `SMTP_SECURE` | `false` | STARTTLS, not implicit TLS |
| `SMTP_USER` | `your@gmail.com` | |
| `SMTP_PASS` | `***` | Gmail app password |
| `SMTP_FROM` | `noreply@eservice.gov.ph` | |

### Google OAuth (optional)

| Variable | Value | Notes |
|----------|-------|-------|
| `GOOGLE_CLIENT_ID` | `***` | |
| `GOOGLE_CLIENT_SECRET` | `***` | |
| `GOOGLE_CALLBACK_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}/api/auth/portal/google/callback` | |

### Frontend (build-time)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}/api` | **Must be HTTPS** — app throws error on non-localhost HTTP in production |
| `VITE_PORTAL_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | If using Supabase client-side features |
| `VITE_SUPABASE_ANON_KEY` | `***` | Supabase anon key |

### Build-time vs Runtime

`VITE_*` variables are baked into the frontend JavaScript during `npm run build`. They must be set **before** the first deploy. Changing them requires a **redeploy** (Railway rebuild).

All other variables are read at runtime by the Node.js backend and take effect on container restart.

## Deploy

1. Connect your GitHub repo to a Railway project
2. Set the environment variables listed above
3. Railway auto-detects the Dockerfile and builds
4. The container starts with `proc-compose up -f proc-compose.prod.yml --no-color`
5. merge-port binds to `$PORT` and routes:
   - `/api/*`, `/health`, `/socket.io/*` to backend (port 3000)
   - Everything else to frontend (port 4173)

## Health Check

merge-port exposes `/_health` at the root port. Configure Railway's health check to:

```
Path: /_health
```

This returns `200 ok` and does not proxy to any upstream service.

## Verify Deployment

After deploy, check:

```
https://your-app.up.railway.app/           → frontend loads
https://your-app.up.railway.app/api/health → backend responds
https://your-app.up.railway.app/_health    → merge-port responds "ok"
```

## Troubleshooting

### Container keeps restarting
Check Railway logs. If you see "max restarts (10) reached, giving up" the backend is crashing repeatedly. Common causes:
- `DATABASE_URL` or `DIRECT_URL` is wrong or has unencoded special characters
- Missing `JWT_SECRET`
- Prisma client not generated (should happen during `npm run build`)

### Frontend shows blank page or auth errors
`VITE_API_BASE_URL` was not set before build, or was set to a non-HTTPS URL. The frontend's `auth.service.ts` explicitly throws on non-localhost HTTP in production. Fix the variable and trigger a redeploy.

### Socket.io not connecting
Socket.io is routed via the `/socket.io` api prefix in `proc-compose.prod.yml`. If WebSocket connections fail, verify the frontend is connecting to the Railway public URL (not localhost).

### Redis connection errors in logs
These are warnings, not fatal. The backend uses Redis for caching only (via `lazyConnect: true`). If Redis fails, caching is disabled and the app continues working.

### Database special characters
If your Supabase password contains `&`, `@`, or `?`, they must be percent-encoded in `DATABASE_URL` and `DIRECT_URL`:
- `&` becomes `%26`
- `@` becomes `%40`
- `?` becomes `%3F`

## File Reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-process container build (TypeScript compile + Vite build) |
| `.dockerignore` | Excludes node_modules, dist, .env.local, logs |
| `proc-compose.prod.yml` | Production process config (redis + frontend + backend + socket.io routing) |
| `proc-compose.yml` | Development config (frontend + backend only) |
| `multysis-backend/DEPLOY_CHECKLIST.md` | Supabase unified DB migration checklist (separate from Railway deploy) |
