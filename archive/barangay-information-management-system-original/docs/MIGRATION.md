# 🚀 Migration Documentation

## Overview

This document consolidates all migration-related documentation for the BIMS project, including the unified migration system, GIS code migration, and migration testing results.

## 🗄️ Unified Database Migration System

### Overview
The BIMS project features a **unified database migration system** that consolidates all database setup operations into a single, comprehensive command.

### Migration Command
```bash
# Single command for complete database setup
npm run db:migrate
```

### Migration Steps (9 Total)
1. **Database Creation** - Creates PostgreSQL database if it doesn't exist
2. **Schema Migration** - Executes schema files and creates all tables
3. **GIS Data Conversion** - Converts GIS data to SQL format
4. **GIS Data Import** - Imports municipality and barangay GIS data
5. **GIS Code Migration** - Adds and populates GIS codes
6. **Data Seeding** - Seeds initial system data
7. **Audit System Setup** - Configures audit logging system
8. **Classification Types Seeding** - Seeds default classification types
9. **Verification** - Verifies migration success and reports status

### Advanced Options
```bash
# Show help and available options
npm run db:migrate -- --help

# Resume from last completed step
npm run db:migrate -- --resume

# Continue despite errors
npm run db:migrate -- --force

# Skip specific steps
npm run db:migrate -- --skip-step=2 --skip-step=3

# Create backup before migration
npm run db:migrate -- --backup
```

### Migration Features
- **Idempotent Design**: Safe to run multiple times
- **Resume Capability**: Can resume from last completed step
- **Error Handling**: Graceful failure with clear error messages
- **Comprehensive Logging**: Step-by-step progress tracking
- **Backup Support**: Optional backup before migration

## 🗺️ GIS Code Migration

### Purpose
The GIS code migration adds the `gis_code` column to the `municipalities` table and populates it with proper GIS municipality codes.

### Migration Process
1. **Add Column**: Adds `gis_code VARCHAR(20)` to municipalities table
2. **Create Index**: Creates index on `gis_code` column for performance
3. **Populate Data**: Populates GIS codes for all municipalities
4. **Handle Missing**: Assigns default codes for municipalities without GIS data

### Implementation Details
```sql
-- Add gis_code column
ALTER TABLE municipalities ADD COLUMN gis_code VARCHAR(20);

-- Create index for performance
CREATE INDEX idx_municipalities_gis_code ON municipalities (gis_code);

-- Populate GIS codes
UPDATE municipalities 
SET gis_code = gis.gis_municipality_code
FROM gis_municipality gis
WHERE municipalities.municipality_name = gis.name;
```

### Benefits
- **Municipality Identification**: Unique GIS codes for each municipality
- **Map Integration**: Proper integration with GIS mapping systems
- **Data Consistency**: Standardized municipality identification
- **Performance**: Indexed lookups for better performance

## 🧪 Migration Testing Results

### Test Environment
- **Database**: PostgreSQL 12+ with PostGIS
- **Test Date**: September 30, 2025
- **Test Method**: Complete database drop and rebuild

### Test Results
✅ **All 9 migration steps completed successfully**
✅ **Database schema created correctly**
✅ **GIS data imported successfully**
✅ **Classification types seeded**
✅ **Audit system configured**
✅ **Verification passed**

### Performance Metrics
- **Total Migration Time**: ~2-3 minutes
- **Database Size**: ~50MB (with GIS data)
- **Tables Created**: 18 core tables
- **Indexes Created**: 25+ performance indexes
- **GIS Records**: 61 barangays, 1 municipality

### Idempotency Test
✅ **Second migration run**: All steps skipped (idempotent)
✅ **No conflicts**: Existing data preserved
✅ **No errors**: Clean execution

### Verification Results
```sql
-- Table counts verified
municipalities: 1 record
barangays: 61 records
gis_municipality: 1 record
gis_barangay: 61 records
classification_types: 21 records
users: 2 records (admin users)
```

## 🔧 Migration Troubleshooting

### Common Issues
1. **Permission Denied**
   ```bash
   # Fix permissions
   sudo chown -R postgres:postgres /var/lib/postgresql/
   ```

2. **Database Already Exists**
   - Migration is idempotent and will skip existing steps

3. **GIS Data Missing**
   ```bash
   # Check GIS data files
   ls -la geodata/
   ```

4. **PostGIS Extension Missing**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

### Recovery Procedures
```bash
# Resume from last completed step
npm run db:migrate -- --resume

# Skip problematic step
npm run db:migrate -- --skip-step=X --force

# Create backup before retry
npm run db:migrate -- --backup
```

## 📊 Migration History

### Version 2.0.0 (September 30, 2025)
- ✅ Unified migration system implemented
- ✅ GIS code migration added
- ✅ Idempotent design implemented
- ✅ Comprehensive error handling
- ✅ Resume capability added

### Version 1.0.0 (Previous)
- Basic migration system
- Separate migration commands
- Manual step execution required

## 🎯 Best Practices

### Before Migration
1. **Backup Database**: Always backup before migration
2. **Check Dependencies**: Ensure all required tools are installed
3. **Verify Environment**: Check environment variables
4. **Test Connection**: Verify database connectivity

### During Migration
1. **Monitor Progress**: Watch migration logs
2. **Handle Errors**: Use --force for non-critical errors
3. **Resume if Needed**: Use --resume if interrupted
4. **Verify Results**: Check migration verification report

### After Migration
1. **Test Application**: Verify application functionality
2. **Check Data**: Validate data integrity
3. **Performance Test**: Test database performance
4. **Document Results**: Record migration results

## 📞 Support

### Migration Issues
- Check [Database Documentation](DATABASE.md) for detailed schema information
- Review [Quick Reference](QUICK_REFERENCE.md) for common solutions
- Consult [Deployment Guide](DEPLOYMENT_GUIDE.md) for setup procedures

### Getting Help
1. **Check Logs**: Review migration logs for specific errors
2. **Verify Environment**: Ensure all requirements are met
3. **Test Connectivity**: Verify database and network connectivity
4. **Contact Support**: Reach out to system administrator

---

**Last Updated**: September 30, 2025  
**Migration Status**: ✅ Complete  
**System Status**: Production Ready 🚀
