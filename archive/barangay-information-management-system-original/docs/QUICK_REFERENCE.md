# Quick Reference: Database Migration & Municipality Setup

## 🚀 **One Command to Rule Them All**

```bash
npm run db:migrate
```

**That's it!** This single command handles all database operations.

## 🎯 **Municipality Setup Fix**

### Problem (Before)
- ❌ Form showed "Please select a municipality from the map before submitting"
- ❌ Couldn't submit municipality setup form
- ❌ Missing `gis_code` column in database

### Solution (After)
- ✅ Form submits without requiring map selection
- ✅ Database has proper `gis_code` column
- ✅ GIS codes populated for all municipalities
- ✅ Public API endpoint used correctly

## 📋 **Migration Steps**

The unified migration runs **9 steps automatically**:

1. **Database Creation** - Creates PostgreSQL database
2. **Schema Migration** - Creates tables and indexes
3. **GIS Data Conversion** - Converts GIS data to SQL
4. **GIS Data Import** - Imports municipality/barangay data
5. **GIS Code Migration** - Adds gis_code column + populates codes
6. **Data Seeding** - Seeds initial data
7. **Audit System Setup** - Sets up audit logging
8. **Classification Types** - Seeds classification types
9. **Verification** - Verifies migration success

## 🛠️ **Usage Examples**

### Basic Usage
```bash
# From root directory
npm run db:migrate

# From server directory
cd server && npm run db:migrate
```

### Advanced Options
```bash
# Show help
cd server && npm run db:migrate -- --help

# Resume from last step
cd server && npm run db:migrate -- --resume

# Skip specific steps
cd server && npm run db:migrate -- --skip-step=2 --skip-step=3

# Continue despite errors
cd server && npm run db:migrate -- --force
```

### Setup Commands
```bash
# Complete setup
npm run setup

# Manual setup
npm run install-all && npm run db:migrate && npm run dev

# Production deployment
npm run deploy:manual
```

## 📊 **Current Database Status**

```
📊 Migration Summary:
  municipalities: 1 records
  barangays: 0 records
  puroks: 0 records
  residents: 0 records
  users: 1 records
  classification_types: 0 records
  PostGIS: PostgreSQL 17.6

✅ All municipalities have GIS codes
✅ Database schema complete
✅ Migration system unified
```

## 🚫 **Deprecated Commands**

**Don't use these anymore:**
- ❌ `npm run db:seed`
- ❌ `npm run db:add-gis-code`
- ❌ `npm run db:convert-geojson`
- ❌ `npm run db:import-gis`
- ❌ `npm run db:convert-shapefile`
- ❌ `npm run db:cleanup-audit`
- ❌ `npm run db:seed-classification-types`
- ❌ `npm run db:setup-audit`
- ❌ `npm run db:complete-migration`
- ❌ `npm run db:rollback`

## 🔧 **Troubleshooting**

### Migration Fails
```bash
# Resume from last completed step
npm run db:migrate -- --resume

# Skip problematic step
npm run db:migrate -- --skip-step=X --force
```

### Municipality Setup Issues
1. Check if `gis_code` column exists in `municipalities` table
2. Verify GIS codes are populated in `gis_municipality` table
3. Ensure frontend uses `/public/geojson/municipalities` endpoint

### Environment Issues
Ensure `.env` file has correct database credentials:
```env
PG_USER=postgres
PG_PASSWORD=12345678
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=bims_production
REDIS_PASSWORD=redis1234
```

## 📚 **Documentation Files**

- `docs/SESSION_SUMMARY.md` - Complete session summary
- `docs/SESSION_DOCUMENTATION.md` - Detailed session documentation
- `docs/UNIFIED_MIGRATION_GUIDE.md` - Unified migration system guide
- `docs/GIS_CODE_MIGRATION_GUIDE.md` - GIS code migration guide
- `docs/QUICK_REFERENCE.md` - This quick reference

## ✅ **Success Checklist**

- [ ] Municipality setup form works
- [ ] Database has `gis_code` column
- [ ] GIS codes populated for municipalities
- [ ] Unified migration runs successfully
- [ ] All deprecated commands removed
- [ ] Team trained on new system
- [ ] Documentation updated

## 🎉 **Key Benefits**

- ✅ **Simplified**: 15+ commands → 1 command
- ✅ **Reliable**: Idempotent and error-resistant
- ✅ **Comprehensive**: All database operations in one place
- ✅ **Well-documented**: Clear guides and examples
- ✅ **Future-proof**: Easy to maintain and extend

---

**Remember**: Just run `npm run db:migrate` and you're done! 🚀
