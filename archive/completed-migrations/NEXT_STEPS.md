# Next Steps: Database Table Consolidation

## 📋 Overview
This guide will help you apply the database table consolidation changes to your database.

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Test Environment**: Test on development/staging first before production
3. **Supabase Integration**: If using Supabase, refer to the [Supabase Setup Guide](./SUPABASE_SETUP.md) for environment and migration details.
4. **Data Migration**: The migrations include data migration, so existing data will be preserved

## 🚀 Step-by-Step Guide

### Step 1: Review the Changes

The following consolidations have been implemented:

1. **PlaceOfBirth Consolidation**
   - Merged `PlaceOfBirth` and `CitizenPlaceOfBirth` into a single `PlaceOfBirth` table
   - Migration: `20251128130000_consolidate_place_of_birth`

2. **Beneficiary Program Pivot Consolidation**
   - Merged 4 pivot tables into a single `BeneficiaryProgramPivot` table
   - Migration: `20251128130100_consolidate_beneficiary_programs`
   - Added `BeneficiaryType` enum

### Step 2: Clean Up Duplicate Migrations (if any)

If you see duplicate migration folders, remove the older/empty ones:
```bash
# Check for empty or duplicate migration folders
# Remove any duplicates - keep only the ones with proper SQL files
```

### Step 3: Generate Prisma Client

This has already been done, but you can regenerate if needed:

```bash
cd multysis-backend
npm run db:generate
```

### Step 4: Review Migrations (Optional but Recommended)

Review the migration SQL files to understand what will happen:

```bash
# View place of birth migration
cat prisma/migrations/20251128130000_consolidate_place_of_birth/migration.sql

# View beneficiary programs migration
cat prisma/migrations/20251128130100_consolidate_beneficiary_programs/migration.sql
```

### Step 5: Apply Migrations

**For Development:**
```bash
cd multysis-backend
npm run db:migrate
```

This will:
- Apply both new migrations
- Migrate existing data from old tables to new ones
- Drop the old tables
- Update the database schema

**For Production:**
```bash
npm run db:migrate:prod
```

### Step 6: Verify Data Integrity

After migrations, verify that data was migrated correctly:

1. **Check Place of Birth Data:**
   ```sql
   -- Check citizens have place of birth
   SELECT COUNT(*) FROM place_of_birth WHERE "citizenId" IS NOT NULL;
   
   -- Check non-citizens have place of birth
   SELECT COUNT(*) FROM place_of_birth WHERE "nonCitizenId" IS NOT NULL;
   ```

2. **Check Beneficiary Programs:**
   ```sql
   -- Check migrated program associations
   SELECT "beneficiaryType", COUNT(*) 
   FROM beneficiary_program_pivots 
   GROUP BY "beneficiaryType";
   ```

3. **Use Prisma Studio (Visual Check):**
   ```bash
   npm run db:studio
   ```
   - Open `http://localhost:5555`
   - Browse `PlaceOfBirth` table
   - Browse `BeneficiaryProgramPivot` table
   - Verify data looks correct

### Step 7: Test Functionality

Test the following operations:

1. **Place of Birth:**
   - Create a new citizen with place of birth
   - Update an existing citizen's place of birth
   - Create a new non-citizen (subscriber) with place of birth

2. **Beneficiary Programs:**
   - Create a senior citizen beneficiary and assign programs
   - Create a PWD beneficiary and assign programs
   - Create a student beneficiary and assign programs
   - Create a solo parent beneficiary and assign programs
   - Verify `ALL` type programs are automatically included for all beneficiaries

3. **API Endpoints:**
   - Test beneficiary listing endpoints
   - Test beneficiary creation/update endpoints
   - Verify program filtering works correctly

### Step 8: Verify ALL Type Programs

Test that `ALL` type programs are automatically included:

1. Check seed data has `ALL` type programs:
   ```bash
   npm run db:seed
   ```

2. Create a beneficiary and verify they automatically have access to `ALL` programs:
   - Libre Sakay (ALL)
   - Libre Medisina (ALL)

### Step 9: Restart Backend Server

After migrations, restart your backend server to ensure it picks up the new schema:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## 🔧 Troubleshooting

### Migration Fails

If a migration fails:

1. **Check Error Message**: The error will tell you what went wrong
2. **Rollback**: If needed, restore from backup
3. **Fix Migration SQL**: Edit the migration file and try again
4. **Manual Intervention**: You may need to manually fix data issues

### Data Missing After Migration

1. **Check Migration Logs**: See if there were any warnings
2. **Verify Source Tables**: Check if old tables still exist
3. **Manual Data Migration**: You may need to manually migrate missing data

### TypeScript Errors

If you see TypeScript errors about missing types:

```bash
npm run db:generate
```

## ✅ Success Checklist

- [ ] Migrations applied successfully
- [ ] All existing data migrated correctly
- [ ] Old tables removed
- [ ] Prisma Client generated
- [ ] Backend server starts without errors
- [ ] Create/update operations work for place of birth
- [ ] Create/update operations work for beneficiary programs
- [ ] ALL type programs automatically included for beneficiaries
- [ ] API endpoints return correct data

## 📝 Additional Notes

- The `ALL` type programs are now **automatically included** for all beneficiaries - no need to assign them manually
- Place of birth now uses a single table for both citizens and non-citizens
- Beneficiary programs use a unified pivot table with a `beneficiaryType` discriminator

## 🆘 Need Help?

If you encounter issues:
1. Check the migration SQL files
2. Review error messages carefully
3. Check Prisma migration logs
4. Verify your database connection
5. Ensure you have proper database backups

