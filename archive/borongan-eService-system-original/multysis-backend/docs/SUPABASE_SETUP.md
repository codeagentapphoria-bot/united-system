# Supabase Integration & Configuration

This guide explains how to configure and use Supabase as the PostgreSQL database provider for the Multysis project.

## 📋 Prerequisites
- A Supabase project.
- Database connection strings (Transaction Pooler and Direct Connection).

## 🔐 Environment Variables

Supabase requires two distinct connection strings in your `.env` file:

1. **DATABASE_URL**: Used by the application for regular queries. Use the **Transaction Pooler** (Port 6543) with `?pgbouncer=true`.
2. **DIRECT_URL**: Used by Prisma for migrations and introspection. Use the **Direct Connection** (Port 5432).

### Example `.env` Configuration

```bash
# Supabase Transaction Pooler (Port 6543)
DATABASE_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct Connection (Port 5432)
DIRECT_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

## 🛠️ Prisma Configuration

The `schema.prisma` is already configured to support these two URLs:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 🚀 Database Operations

When using Supabase, use the following commands for database management:

### 1. Generating Prisma Client
```bash
npx prisma generate
```

### 2. Running Migrations & Seeding
For a fresh Supabase database or after schema changes, run the following sequence:

```bash
# 1. Apply any pending migrations
npx prisma migrate dev

# or
# - Apply any pending migrations
npx prisma migrate dev --name your_migration_name

# 2. Seed initial data
npx prisma db seed
```

### 3. Production Deployment
When deploying to production, use the deployment-safe migration command:
```bash
npx prisma migrate deploy
```

## 🔧 Troubleshooting

### Connection Timeouts
If you encounter timeouts, ensure the IP address of your development machine is whitelisted in **Supabase Dashboard > Settings > Database > Network Restrictions**.

### Transaction Pooler Issues
If transactions fail with `P2024` errors, ensure you have `?pgbouncer=true` appended to your `DATABASE_URL`.

### EPERM Error on Windows
During `prisma generate`, you might encounter an `EPERM` error. This is often due to the Prisma engine being locked by a running process. Close the development server before running generate.

```bash
# If you see EPERM
npx.cmd prisma generate
```
