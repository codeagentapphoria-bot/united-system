# Local Testing Setup - Borongan E-Services

**Purpose:** Run E-Services locally to test baseline functionality before integration service is built  
**Duration:** ~1-2 hours setup  
**Target:** Mar 19-20, 2026  

---

## 🎯 What We're Testing

**Baseline E-Services Functionality (Current State):**
- ✅ Backend API endpoints (citizen registration, transactions, services)
- ✅ Database operations (Prisma ORM)
- ✅ Authentication (JWT)
- ✅ Email/OTP functionality
- ✅ WebSocket real-time events
- ✅ File uploads
- ✅ Error handling

**NOT testing yet:**
- ❌ Integration with unified DB (that's Phase 3)
- ❌ Fuzzy matching (Phase 3)
- ❌ Offline sync (Phase 3)
- ❌ Conflict resolution (Phase 3)

---

## 📋 Prerequisites

Check you have installed:
```bash
# Check Node.js (need v18+)
node --version
# Expected: v18.0.0 or higher

# Check npm (need v9+)
npm --version
# Expected: v9.0.0 or higher

# Check PostgreSQL (local database)
psql --version
# Expected: PostgreSQL 12+
```

**If missing:**
- Node.js: Download from https://nodejs.org (LTS version)
- PostgreSQL: Download from https://postgresql.org or use Docker

---

## 🚀 Step 1: Clone & Install Dependencies

```bash
# Navigate to E-Services backend
cd /root/.openclaw-kim/workspace/Borongan-E-Services/multysis-backend

# Install dependencies
npm install

# Expected output: "added XXX packages"
```

**Time:** ~5-10 minutes (first time)

---

## 🗄️ Step 2: Create Local Database

### Option A: Local PostgreSQL (Recommended)

```bash
# Start PostgreSQL (if not running)
# macOS (Homebrew):
brew services start postgresql

# Linux (systemd):
sudo systemctl start postgresql

# Windows (pgAdmin or SQL Shell): 
# Start PostgreSQL from installed app

# Verify PostgreSQL running
psql --version

# Create database
createdb multysis

# Verify database created
psql -l | grep multysis

# Expected: "multysis | postgres | UTF8"
```

### Option B: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run -d \
  --name postgres-multysis \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=multysis \
  -p 5432:5432 \
  postgres:15

# Verify running
docker ps | grep postgres-multysis
```

---

## 📝 Step 3: Configure Environment (.env)

### Create .env file

```bash
# Copy example to .env
cd multysis-backend
cp .env.example .env
```

### Edit .env with local settings

```bash
# Open .env and edit:
nano .env
```

**Set these values:**

```env
# Basic Config
NODE_ENV=development
PORT=5000
DEBUG_DB=false

# LOCAL PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=multysis
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multysis

# JWT
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Redis (Optional - for local testing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email (Optional - can disable for testing)
EMAIL_ENABLED=false

# Frontend URL
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# API
API_PREFIX=/api
API_VERSION=v1

# Logging
LOG_LEVEL=debug

# Session
SESSION_SECRET=dev-session-secret

# Uploads
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
```

**Save & close** (Ctrl+X, then Y, then Enter in nano)

---

## 🔄 Step 4: Database Setup (Prisma)

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations (create tables)
npm run db:migrate

# Expected output:
# "Your database is now in sync with your schema."

# (Optional) Seed sample data
npm run db:seed:sample

# Verify tables created
npx prisma studio

# Browser opens at http://localhost:5555
# Shows all tables in visual editor
```

**Troubleshooting if migration fails:**

```bash
# Check database connection
psql postgresql://postgres:postgres@localhost:5432/multysis

# If error: Reset database
npm run db:reset
# Warning: This deletes all data and recreates tables

# Then seed again
npm run db:seed:sample
```

---

## ✅ Step 5: Start E-Services Backend

```bash
# Start development server
npm run dev

# Expected output:
# "Server running on http://localhost:5000"
# "Database connected"
# "Listening on port 5000"
```

**Keep this running** (terminal stays open)

---

## 🧪 Step 6: Test API Endpoints

### Open new terminal (keep dev server running)

```bash
# Test 1: Health Check
curl http://localhost:5000/api/health
# Expected: { "status": "OK" }

# Test 2: Create Citizen (Registration)
curl -X POST http://localhost:5000/api/citizens \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "email": "juan@example.com",
    "phoneNumber": "09171234567",
    "birthDate": "1990-01-15",
    "civilStatus": "Single",
    "sex": "Male",
    "username": "juandc",
    "pin": "1234"
  }'

# Expected: { "id": "...", "firstName": "Juan", ... }

# Test 3: Get Citizen
curl http://localhost:5000/api/citizens/[ID_FROM_TEST_2]
# Expected: Citizen data

# Test 4: Create Transaction
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "[ID_FROM_TEST_2]",
    "serviceId": "[SERVICE_ID]",
    "status": "PENDING",
    "type": "APPLICATION"
  }'

# Expected: Transaction created
```

---

## 📊 Step 7: Run Tests

```bash
# Unit tests
npm run test

# Watch mode (auto-rerun on changes)
npm run test:watch

# E2E tests (integration testing)
npm run test:e2e

# Coverage report
npm run test -- --coverage
```

---

## 🌐 Step 8: Frontend Connection (Optional)

If you want to test frontend ↔ backend:

```bash
# Terminal 1: Keep backend running
cd multysis-backend
npm run dev

# Terminal 2: Start frontend
cd ../multysis-frontend
npm install
npm run dev

# Browser: http://localhost:5173
# Frontend will call backend at http://localhost:5000
```

---

## 🔍 Debugging & Monitoring

### View Database (Visual Studio)

```bash
# While backend is running, in another terminal:
npx prisma studio

# Opens: http://localhost:5555
# Shows all tables, records, relationships
```

### View Logs

```bash
# Backend logs appear in dev terminal
# Look for:
# ✅ "Database connected"
# ✅ "Server running on port 5000"
# ⚠️ Any errors in red

# To save logs to file:
npm run dev > app.log 2>&1 &
```

### Test Postman/Insomnia

```bash
# Install Postman or Insomnia (free)
# Import E-Services API collection:
# File → Import → Paste this URL:
# (If E-Services has public Postman collection)

# Or create requests manually:
POST http://localhost:5000/api/citizens
GET http://localhost:5000/api/transactions
POST http://localhost:5000/api/services
```

---

## 🛑 Troubleshooting

### Port 5000 Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill it
kill -9 [PID]

# Or use different port in .env
PORT=5001
```

### Database Connection Error

```bash
# Verify PostgreSQL running
psql -U postgres -d multysis

# If fails: Start PostgreSQL
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Check .env DATABASE_URL is correct
# Should be: postgresql://postgres:postgres@localhost:5432/multysis
```

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Generate Prisma types
npm run db:generate

# Type check
npm run typecheck

# Rebuild
npm run build
```

---

## 📋 Checklist Before Phase 3

**Before Integration Service is built, verify:**

- [ ] Backend starts without errors (`npm run dev`)
- [ ] Database connected (check Prisma Studio)
- [ ] API endpoints respond (test with curl)
- [ ] Tests pass (`npm run test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Email/OTP disabled for dev (EMAIL_ENABLED=false)
- [ ] Sample data seeded (`npm run db:seed:sample`)
- [ ] Can create citizen
- [ ] Can create transaction
- [ ] Can list records in Prisma Studio

---

## 🎯 What To Test Now (Baseline)

| Feature | How to Test | Expected Result |
|---------|------------|-----------------|
| Citizen Registration | POST /api/citizens | New citizen created |
| Get Citizen | GET /api/citizens/:id | Returns citizen data |
| Transaction Creation | POST /api/transactions | Transaction stored |
| Service Listing | GET /api/services | Lists available services |
| Authentication | POST /api/auth/login | JWT token returned |
| WebSocket | Connect to ws://localhost:5000 | Real-time events received |
| File Upload | POST /api/upload (multipart) | File saved to ./uploads |

---

## ⏭️ After Phase 3 (Integration Service)

Once Marcus builds integration service, you'll:
1. Start integration service on port 5001
2. Update backend to call integration service APIs
3. Test fuzzy matching, offline sync, conflict resolution
4. Test with unified database

For now: **Just test baseline E-Services functionality** ✅

---

## 📞 Need Help?

- **Issues with setup?** Ask Kim
- **Database errors?** Check PostgreSQL logs
- **API not responding?** Check port 5000 is open
- **TypeScript errors?** Run `npm run typecheck`

---

**Setup Time:** ~1-2 hours first run  
**Subsequent Runs:** `npm run dev` (< 1 minute)

**Status:** Ready to test E-Services baseline! ✅
