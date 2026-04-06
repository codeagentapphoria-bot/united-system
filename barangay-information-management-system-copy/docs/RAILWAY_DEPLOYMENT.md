# BIMS Railway Deployment Guide

This guide covers deploying BIMS on Railway using Docker with proc-compose as the multi-process entrypoint.

## How It Works

The Dockerfile builds a single container that runs three processes via proc-compose:

```
Docker container ($PORT)
  proc-compose up -f proc-compose.prod.yml --no-color
    redis-server        ← in-container cache (port 6379)
    npm run preview     ← Vite static server (port 4173)
    npm run start       ← Node.js backend (port 5000)
    merge-port          ← reverse proxy on $PORT (auto-injected)
```

- `merge-port` binds to Railway's `$PORT` automatically (no config needed)
- Backend waits for Redis to be ready before starting (`depends_on` + `ready_when`)
- If the backend crashes, proc-compose retries up to 10 times then exits non-zero, triggering a Railway container restart

## Prerequisites

- Railway account with a project created
- GitHub repo connected to Railway
- PostgreSQL database provisioned (Railway add-on or external like Supabase)

## Environment Variables

Set these in Railway's **Variables** tab before the first deploy.

### Required

| Variable | Value | Notes |
|----------|-------|-------|
| `PG_USER` | `postgres` | Database user |
| `PG_HOST` | `your-db-host` | Railway Postgres or Supabase host |
| `PG_DATABASE` | `bims_production` | Database name |
| `PG_PASSWORD` | `***` | Database password |
| `PG_PORT` | `5432` | Database port |
| `PG_SSL` | `true` | Required for remote databases |
| `JWT_SECRET` | `***` | Long random string, shared with E-Services |
| `NODE_ENV` | `production` | |
| `NO_COLOR` | `1` | Clean logs in Railway log viewer |
| `VITE_API_BASE_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}/api` | Baked into frontend at build time |

### Optional

| Variable | Value | Notes |
|----------|-------|-------|
| `JWT_EXPIRES_IN` | `1d` | Token expiry |
| `CORS_ORIGIN` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | If frontend and backend are on the same domain, this can be omitted |
| `BASE_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Used by backend for generating URLs |
| `GMAIL_USER` | `your@gmail.com` | For email notifications |
| `GMAIL_PASS` | `***` | Gmail app password |
| `SMTP_FROM` | `noreply@yourdomain.com` | From address for emails |
| `REDIS_ENABLED` | `true` | Enabled by default in prod config |
| `REDIS_HOST` | `localhost` | In-container Redis, already set in proc-compose.prod.yml |
| `REDIS_PORT` | `6379` | Already set in proc-compose.prod.yml |
| `VITE_EXTERNAL_API_URL` | `http://3.104.0.203` | External API if needed |
| `VITE_EXTERNAL_API_KEY` | `***` | External API key |

### Build-time vs Runtime

`VITE_*` variables are baked into the frontend JavaScript during `npm run build`. They must be set **before** the first deploy. Changing them requires a **redeploy** (Railway rebuild).

All other variables are read at runtime by the Node.js backend and take effect on container restart.

## Deploy

1. Connect your GitHub repo to a Railway project
2. Set the environment variables listed above
3. Railway auto-detects the Dockerfile and builds
4. The container starts with `proc-compose up -f proc-compose.prod.yml --no-color`
5. merge-port binds to `$PORT` and Railway routes traffic to it

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
- Database connection string is wrong (check `PG_*` vars)
- `PG_SSL=true` not set for remote databases
- Missing `JWT_SECRET`

### Frontend shows blank page
`VITE_API_BASE_URL` was not set before build, or was set to a non-HTTPS URL. Fix the variable and trigger a redeploy.

### Redis connection errors in logs
These are warnings, not fatal. The backend works without Redis (caching disabled). If you see `[CACHE] Redis connected successfully` in logs, Redis is working.

## File Reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-process container build |
| `.dockerignore` | Excludes node_modules, dist, .env.local, logs |
| `proc-compose.prod.yml` | Production process config (redis + frontend + backend) |
| `proc-compose.yml` | Development config (frontend + backend only) |
