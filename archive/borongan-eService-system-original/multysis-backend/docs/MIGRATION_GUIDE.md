# Database Migration Guide

This guide covers database migrations for Multysis v2, including the gateway table architecture migration.

## 📋 Table of Contents

1. [Fresh Database Setup](#fresh-database-setup)
2. [Gateway Architecture Migration](#gateway-architecture-migration)
3. [Troubleshooting](#troubleshooting)

## 🆕 Fresh Database Setup

If you're setting up a **new database** (no existing data), follow these steps:

### ⚠️ Important: Prisma Does NOT Create Databases

**Prisma does NOT automatically create the database.** The database must exist before running migrations. You need to create it manually first.

### Step 1: Create Database

**⚠️ Important:** The database name comes from your `DATABASE_URL` environment variable. Prisma extracts the database name from the connection string.

**Example DATABASE_URL format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME?schema=SCHEMA
```

**To find your database name:**
- Extract it from your `.env` file's `DATABASE_URL`
- The database name is the part after the port and before the `?`

**Option A: Using npm script (Recommended)**
```bash
cd multysis-backend
npm run db:create
```

This script automatically:
- Reads `DATABASE_URL` from your `.env` file
- Extracts database name and connection details
- Creates the database if it doesn't exist

**Option B: Using `createdb` command:**
```bash
# Replace 'your_database_name' with the database name from your DATABASE_URL
createdb -U postgres your_database_name
```

**Option C: Using `psql`:**
```bash
# Replace 'your_database_name' with the database name from your DATABASE_URL
psql -U postgres -c "CREATE DATABASE your_database_name;"
```

**Option D: Using Docker (database auto-creates):**
```bash
docker-compose up postgres
# Database is created automatically via POSTGRES_DB env var or DATABASE_URL
```

### Step 2: Run Migrations and Seed

**For Production/CI (applies migrations without prompts):**
```bash
cd multysis-backend

# Generate Prisma Client, apply migrations, and seed
npm run db:setup
```

**For Development (with migration prompts):**
```bash
cd multysis-backend

# Generate Prisma Client
npm run db:generate

# Run all migrations (will prompt if schema changed)
npm run db:migrate

# Seed database
npm run db:seed
```

**Alternative: Using individual commands:**
```bash
npx prisma generate
npx prisma migrate deploy  # or: npx prisma migrate dev
npx prisma db seed
```

### Troubleshooting Migration Errors

If you encounter collation version mismatch errors:

```bash
# Option 1: Use db push (development only, bypasses migrations)
npm run db:push
npm run db:generate

# Option 2: Fix collation (requires admin access)
psql -U postgres -d multysis -c "ALTER DATABASE multysis REFRESH COLLATION VERSION;"
npm run db:migrate
```

## 🔄 Gateway Architecture Migration

### Overview

The gateway architecture prevents data duplication by using a `Subscriber` gateway table that routes to either `Citizen` or `NonCitizen` tables.

**Before Migration:**
- `Subscriber` table contained all subscriber data
- `Citizen` table existed separately
- Data duplication when linking subscribers to citizens

**After Migration:**
- `Subscriber` (gateway) - Routes to data source
- `Citizen` - Stores citizen data
- `NonCitizen` - Stores non-citizen subscriber data
- No data duplication

### Migration Steps for Existing Database

⚠️ **IMPORTANT**: Backup your database before migration!

```bash
# Backup database
pg_dump -U postgres multysis > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Option 1: Automatic Migration (Recommended)

If you have existing data and need to migrate:

```bash
cd multysis-backend

# Step 1: Ensure Prisma schema is up to date
npx prisma generate

# Step 2: Run migration
npm run db:migrate

# If migration fails, see Troubleshooting section
```

#### Option 2: Manual SQL Migration

If automatic migration fails, use the manual SQL script:

```bash
cd multysis-backend

# Get database connection string from .env
source .env 2>/dev/null || true

# Run manual migration
psql "$DATABASE_URL" -f prisma/migrations/rename_to_gateway/migration.sql

# Generate Prisma Client
npx prisma generate
```

#### Option 3: Data Migration Script

If you need to migrate existing data:

```bash
cd multysis-backend

# Run data migration script
npx ts-node prisma/migrations/migrate_to_gateway/migrate_data.ts
```

### Migration Process Details

The migration performs the following steps:

1. **Create `non_citizens` table** from existing `subscribers` (those not linked to citizens)
2. **Update `place_of_birth`** to reference `nonCitizenId` instead of `subscriberId`
3. **Update `mother_info`** to reference `nonCitizenId` instead of `subscriberId`
4. **Create new `subscribers` gateway table** from `persons` table
5. **Link gateway to `non_citizens`** and `citizens`
6. **Update `transactions`** to reference gateway `subscriberId` (no changes needed if already correct)
7. **Drop old tables** and rename new ones

### Verification After Migration

```bash
cd multysis-backend

# Check tables exist
psql $DATABASE_URL -c "\dt"

# Should see:
# - subscribers (gateway)
# - citizens
# - non_citizens
# - transactions
# - services
# - users
# - roles
# - permissions

# Check gateway structure
psql $DATABASE_URL -c "SELECT type, COUNT(*) FROM subscribers GROUP BY type;"

# Should show:
# - CITIZEN: count of citizen-linked subscribers
# - SUBSCRIBER: count of standalone subscribers

# Verify transactions reference gateway
psql $DATABASE_URL -c "SELECT COUNT(*) FROM transactions WHERE \"subscriberId\" IN (SELECT id FROM subscribers);"
```

## 🐛 Troubleshooting

### Error: Collation Version Mismatch

**Error Message:**
```
Error: P3014: Migration failed due to collation version mismatch
```

**Solution:**

```bash
cd multysis-backend

# Option 1: Use db push (development only, may lose data)
npx prisma db push --accept-data-loss
npx prisma generate

# Option 2: Fix collation (requires PostgreSQL admin)
psql -U postgres -d multysis -c "ALTER DATABASE multysis REFRESH COLLATION VERSION;"
npm run db:migrate
```

### Error: Column Does Not Exist

**Error Message:**
```
Error: Column "nonCitizenId" does not exist
```

**Solution:**

1. Check if migration was partially applied:
   ```bash
   psql $DATABASE_URL -c "\d transactions"
   ```

2. If migration is incomplete, reset and retry:
   ```bash
   # ⚠️ WARNING: This deletes all data!
   npm run db:reset
   npm run db:migrate
   ```

### Error: Foreign Key Constraint Violation

**Error Message:**
```
Error: Foreign key constraint violation
```

**Solution:**

1. Check for orphaned records:
   ```bash
   # Check for transactions without valid subscriber
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM transactions WHERE \"subscriberId\" NOT IN (SELECT id FROM subscribers);"
   ```

2. Clean up orphaned records:
   ```sql
   DELETE FROM transactions WHERE "subscriberId" NOT IN (SELECT id FROM subscribers);
   ```

3. Retry migration

### Error: Duplicate Key Violation

**Error Message:**
```
Error: Duplicate key value violates unique constraint
```

**Solution:**

1. Check for duplicate entries:
   ```bash
   psql $DATABASE_URL -c "SELECT \"citizenId\", COUNT(*) FROM subscribers WHERE \"citizenId\" IS NOT NULL GROUP BY \"citizenId\" HAVING COUNT(*) > 1;"
   ```

2. Remove duplicates:
   ```sql
   -- Keep only the first record, delete others
   DELETE FROM subscribers s1
   USING subscribers s2
   WHERE s1.id > s2.id
     AND s1."citizenId" = s2."citizenId"
     AND s1."citizenId" IS NOT NULL;
   ```

### Migration Partially Applied

If migration fails partway through:

1. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```

2. **Rollback if needed:**
   ```bash
   # Restore from backup
   psql -U postgres multysis < backup_YYYYMMDD_HHMMSS.sql
   ```

3. **Retry migration:**
   ```bash
   npm run db:migrate
   ```

### Prisma Client Out of Sync

**Error Message:**
```
Property 'subscriber' does not exist on type...
```

**Solution:**

```bash
cd multysis-backend

# Regenerate Prisma Client
npx prisma generate

# Restart development server
npm run dev
```

## 📊 Schema Verification

After migration, verify the schema matches expectations:

```bash
cd multysis-backend

# Open Prisma Studio
npm run db:studio
```

Check:
- ✅ `subscribers` table has `type`, `citizenId`, `nonCitizenId` columns
- ✅ `non_citizens` table exists with personal information fields
- ✅ `citizens` table exists
- ✅ `transactions` table has `subscriberId` (references gateway)
- ✅ `place_of_birth` has `nonCitizenId` (not `subscriberId`)
- ✅ `mother_info` has `nonCitizenId` (not `subscriberId`)

## 🔄 Rollback Procedure

If you need to rollback the migration:

```bash
# Restore from backup
psql -U postgres multysis < backup_YYYYMMDD_HHMMSS.sql

# Or reset database (⚠️ WARNING: Deletes all data)
npm run db:reset
```

## 📚 Additional Resources

- [Setup Guide](../SETUP_GUIDE.md) - Complete setup instructions
- [Gateway Architecture](../SETUP_GUIDE.md#gateway-architecture) - Detailed architecture explanation
- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)

## ✅ Migration Checklist

Before migration:
- [ ] Database backup created
- [ ] Prisma schema is up to date
- [ ] All code changes committed
- [ ] Development environment ready

During migration:
- [ ] Migration script runs without errors
- [ ] All tables created successfully
- [ ] Data migrated correctly
- [ ] Foreign keys established

After migration:
- [ ] Schema verified in Prisma Studio
- [ ] Application starts without errors
- [ ] Can create new subscribers
- [ ] Can link subscribers to citizens
- [ ] Transactions work correctly
- [ ] No data duplication

---

**Need Help?** See [Setup Guide](../SETUP_GUIDE.md) or open an issue on GitHub.
