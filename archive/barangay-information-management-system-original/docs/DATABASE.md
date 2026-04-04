# 🗄️ Database Documentation

## Overview

The BIMS database is built on **PostgreSQL** with **PostGIS** extension for geospatial capabilities. It consists of 18 core tables designed to handle complete barangay management operations.

### Key Features

- **PostGIS Integration**: Geospatial data support for mapping and location services
- **Comprehensive Indexing**: Optimized performance with strategic indexes
- **JSONB Support**: Flexible data storage for complex structures
- **Foreign Key Constraints**: Data integrity and referential integrity
- **Automatic Timestamps**: Automatic `updated_at` field management via triggers
- **Data Validation**: Check constraints ensure data quality

## 📊 Database Tables

### Authentication & User Management

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(15) NOT NULL CHECK(target_type IN ('municipality', 'barangay')),
    target_id VARCHAR(20) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
    picture_path TEXT,
    last_login TIMESTAMP NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    reset_token TEXT,
    reset_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features**:
- Role-based access control (admin, staff)
- Target-based access (municipality or barangay level)
- Login attempt tracking for security
- Password reset functionality
- Profile picture support

### Geographic Hierarchy

#### municipalities
```sql
CREATE TABLE municipalities (
    id SERIAL PRIMARY KEY,
    municipality_name VARCHAR(50) NOT NULL UNIQUE,
    municipality_code VARCHAR(8) NOT NULL,
    gis_Code VARCHAR(20),
    region VARCHAR(20) NOT NULL,
    province VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    municipality_logo_path TEXT,
    id_background_front_path TEXT,
    id_background_back_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### barangays
```sql
CREATE TABLE barangays (
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER NOT NULL,
    barangay_name VARCHAR(50) NOT NULL UNIQUE,
    barangay_code VARCHAR(20) NOT NULL,
    barangay_logo_path TEXT,
    certificate_background_path TEXT,
    organizational_chart_path TEXT,
    contact_number VARCHAR(15),
    email VARCHAR(50),
    gis_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE CASCADE
);
```

#### puroks
```sql
CREATE TABLE puroks (
    id SERIAL PRIMARY KEY,
    barangay_id INTEGER NOT NULL,
    purok_name VARCHAR(50) NOT NULL,
    purok_leader VARCHAR(50), 
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
);
```

### Resident Management

#### residents
```sql
CREATE TABLE residents (
    id VARCHAR(20) PRIMARY KEY,
    barangay_id INTEGER NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    suffix VARCHAR(10),
    sex VARCHAR(10) NOT NULL CHECK (sex IN('male', 'female')),
    civil_status VARCHAR(25) NOT NULL CHECK (civil_status IN ('single', 'married', 'widowed', 'separated', 'divorced')),
    birthdate DATE NOT NULL,
    birthplace TEXT NULL,
    contact_number VARCHAR(15) NULL,
    email VARCHAR(100) NULL,
    occupation TEXT NULL,
    monthly_income DECIMAL(10,2) NULL,
    employment_status VARCHAR(20) CHECK (employment_status IN ('employed', 'unemployed', 'self-employed', 'student', 'retired', 'not_applicable')),
    education_attainment VARCHAR(30) NULL,
    resident_status VARCHAR(15) DEFAULT 'active' CHECK (resident_status IN ('active', 'deceased', 'moved_out', 'temporarily_away')),
    picture_path TEXT NULL,
    indigenous_person BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
);
```

#### classification_types
```sql
CREATE TABLE classification_types(
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#4CAF50',
    details JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE CASCADE,
    UNIQUE(municipality_id, name)
);
```

#### resident_classifications
```sql
CREATE TABLE resident_classifications(
    id SERIAL PRIMARY KEY,
    resident_id VARCHAR(20),
    classification_type VARCHAR(50) NOT NULL,
    classification_details JSONB DEFAULT '[]'::JSONB,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);
```

### Household Management

#### households
```sql
CREATE TABLE households (
    id SERIAL PRIMARY KEY,
    house_number VARCHAR(10),
    street VARCHAR(50),
    purok_id INTEGER NOT NULL,
    barangay_id INTEGER NOT NULL,
    house_head VARCHAR(20) NOT NULL,
    housing_type VARCHAR(30),
    structure_type VARCHAR(30),
    electricity BOOLEAN DEFAULT FALSE,
    water_source VARCHAR(30),
    toilet_facility VARCHAR(30),
    geom GEOMETRY(GEOMETRY, 4326),
    area NUMERIC(10,2),
    household_image_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purok_id) REFERENCES puroks(id) ON DELETE CASCADE,
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE,
    FOREIGN KEY (house_head) REFERENCES residents(id) ON DELETE CASCADE
);
```

#### families
```sql
CREATE TABLE families (
    id SERIAL PRIMARY KEY,
    household_id INTEGER NOT NULL,
    family_group VARCHAR(20) NOT NULL,
    family_head VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_head) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);
```

#### family_members
```sql
CREATE TABLE family_members (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL,
    family_member VARCHAR(20) NOT NULL,
    relationship_to_head VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_member) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);
```

### Administrative Management

#### requests
```sql
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    resident_id VARCHAR(20) NULL,
    full_name VARCHAR(200) NULL,
    contact_number VARCHAR(50) NULL,
    email VARCHAR(50) NULL,
    address TEXT NULL,
    barangay_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('certificate', 'appointment')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    certificate_type VARCHAR(100),
    urgency VARCHAR(50) DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'express')),
    purpose TEXT NOT NULL,
    requirements JSONB,
    appointment_with VARCHAR(255),
    appointment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
);
```

#### inventories
```sql
CREATE TABLE inventories (
    id SERIAL PRIMARY KEY,
    barangay_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    sponsors VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(20),
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
);
```

### Geospatial Data (GIS)

#### gis_municipality
```sql
CREATE TABLE IF NOT EXISTS gis_municipality (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);
```

#### gis_barangay
```sql
CREATE TABLE IF NOT EXISTS gis_barangay (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_barangay_code VARCHAR(20),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);
```

## 🗺️ GIS Integration

### PostGIS Extension
```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable PostGIS topology
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### Spatial Data Types
- **Point**: Household locations, landmarks
- **Polygon**: Barangay and municipality boundaries
- **LineString**: Roads, rivers, boundaries
- **MultiPolygon**: Complex boundary shapes

### Coordinate System
- **SRID**: 4326 (WGS84)
- **Projection**: Geographic coordinates (latitude/longitude)
- **Web Compatibility**: Standard for web mapping applications

### Spatial Indexes
```sql
-- Create spatial indexes for performance
CREATE INDEX idx_households_geom ON households USING gist(geom);
CREATE INDEX idx_gis_barangay_geom ON gis_barangay USING gist(geom);
CREATE INDEX idx_gis_municipality_geom ON gis_municipality USING gist(geom);
```

## 📈 Indexing Strategy

### Primary Indexes
```sql
-- Primary key indexes (automatically created)
-- users(id), municipalities(id), barangays(id), etc.
```

### Performance Indexes
```sql
-- User authentication
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);

-- Geographic queries
CREATE INDEX idx_residents_barangay_id ON residents(barangay_id);
CREATE INDEX idx_households_barangay_id ON households(barangay_id);
CREATE INDEX idx_barangays_municipality_id ON barangays(municipality_id);

-- Search indexes
CREATE INDEX idx_residents_name ON residents USING gin(to_tsvector('english', first_name || ' ' || last_name));
CREATE INDEX idx_barangays_name ON barangays USING gin(to_tsvector('english', name));
CREATE INDEX idx_municipalities_name ON municipalities USING gin(to_tsvector('english', name));

-- Status and date indexes
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_submitted_at ON requests(submitted_at);
CREATE INDEX idx_residents_created_at ON residents(created_at);
```

### Composite Indexes
```sql
-- Multi-column queries
CREATE INDEX idx_residents_barangay_status ON residents(barangay_id, is_active);
CREATE INDEX idx_households_barangay_head ON households(barangay_id, household_head_id);
CREATE INDEX idx_requests_resident_type ON requests(resident_id, request_type);
```

## ⚙️ Triggers & Functions

### Updated At Trigger
```sql
-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON residents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Audit Trigger
```sql
-- Function to log changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO archives (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO archives (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO archives (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply audit triggers
CREATE TRIGGER audit_users_changes AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_residents_changes AFTER INSERT OR UPDATE OR DELETE ON residents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## 🚀 Unified Database Migration System

### Overview

The BIMS project now features a **unified database migration system** that consolidates all database setup operations into a single, comprehensive command.

### Migration Command

```bash
# Single command for complete database setup
npm run db:migrate
```

### Migration Steps (9 Total)

1. **Database Creation**
   - Creates PostgreSQL database if it doesn't exist
   - Verifies database connectivity

2. **Schema Migration**
   - Executes `docs/db.docs.txt` schema file
   - Creates all tables, indexes, and constraints
   - Executes `docs/db-config.docs.txt` configuration
   - Sets up triggers, functions, and audit system

3. **GIS Data Conversion**
   - Converts GIS data to SQL format
   - Prepares spatial data for import

4. **GIS Data Import**
   - Imports municipality and barangay GIS data
   - Populates `gis_municipality` and `gis_barangay` tables

5. **GIS Code Migration**
   - Adds `gis_code` column to `municipalities` table
   - Creates index on `gis_code` column
   - Populates GIS codes for all municipalities
   - Updates existing municipalities without GIS codes

6. **Data Seeding**
   - Seeds initial system data
   - Creates default users and configurations

7. **Audit System Setup**
   - Configures audit logging system
   - Sets up audit triggers and functions

8. **Classification Types Seeding**
   - Seeds default classification types
   - Sets up municipality-specific classifications

9. **Verification**
   - Verifies migration success
   - Reports table counts and status
   - Checks PostGIS extension status

### Advanced Options

```bash
# Show help and available options
cd server && npm run db:migrate -- --help

# Resume from last completed step
cd server && npm run db:migrate -- --resume

# Continue despite errors
cd server && npm run db:migrate -- --force

# Skip specific steps
cd server && npm run db:migrate -- --skip-step=2 --skip-step=3

# Create backup before migration
cd server && npm run db:migrate -- --backup
```

### Migration Features

#### Idempotent Design
- **Safe to run multiple times**: Detects existing state and skips completed steps
- **No conflicts**: Handles existing databases, tables, and data gracefully
- **Resume capability**: Can resume from last completed step if interrupted

#### Comprehensive Logging
- **Step-by-step progress**: Clear indication of current step and progress
- **Detailed error messages**: Descriptive error reporting with context
- **Verification reporting**: Final summary with table counts and status

#### Error Handling
- **Graceful failure**: Continues with other steps if one fails (with --force)
- **Clear error messages**: Descriptive errors with suggested solutions
- **Recovery options**: Resume and skip step capabilities

## 🔧 Database Scripts

### Core Database Management
- **migrateDB.js** - Database schema creation and migration
- **seedDatabase.js** - Initial data seeding
- **completeMigration.js** - Complete database setup
- **rollbackMigration.js** - Migration rollback

### GIS Data Processing
- **convertGeoJSONToSQL.js** - Convert GeoJSON to SQL
- **convertShapefileToSQL.js** - Convert Shapefiles to SQL
- **importGISData.js** - Import GIS data into database
- **testOgr2ogr.js** - Test GIS tools availability

### Classification System
- **seed_classification_types.js** - Seed classification types
- **show_classification_types.js** - Display classification types
- **check_table_structure.js** - Validate table structure
- **migrate_classification_types_to_municipality.js** - Migration script

### Audit System
- **setupAuditSystem.js** - Setup audit logging
- **testAuditSystem.js** - Test audit functionality
- **cleanupAuditSystem.js** - Remove audit system

### Cleanup & Maintenance
- **cleanupOrphanedClassifications.js** - Remove orphaned resident classifications
- **cleanupOrphanedBarangayData.js** - Remove orphaned data after barangay deletion
- **investigateOrphanedClassifications.js** - Investigate orphaned classification issues

## 💾 Backup & Recovery

### Backup Strategy
```bash
#!/bin/bash
# Database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/bims"
DB_NAME="bims_db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Full database backup
pg_dump -h localhost -U postgres -d $DB_NAME > $BACKUP_DIR/bims_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/bims_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "bims_*.sql.gz" -mtime +7 -delete
```

### Recovery Procedures
```bash
#!/bin/bash
# Database recovery script

BACKUP_FILE=$1
DB_NAME="bims_db"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop application
pm2 stop bims-backend

# Drop and recreate database
dropdb -h localhost -U postgres $DB_NAME
createdb -h localhost -U postgres $DB_NAME

# Restore from backup
gunzip -c $BACKUP_FILE | psql -h localhost -U postgres -d $DB_NAME

# Restart application
pm2 start bims-backend
```

## 🔧 Maintenance

### Regular Maintenance Tasks
```sql
-- Update table statistics
ANALYZE;

-- Vacuum tables to reclaim space
VACUUM ANALYZE;

-- Reindex tables
REINDEX TABLE users;
REINDEX TABLE residents;
REINDEX TABLE households;

-- Clean up old audit logs
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

### Orphaned Data Cleanup

The system includes scripts to clean up orphaned data that can occur when barangays or residents are deleted but their dependent data remains.

#### Cleanup Orphaned Barangay Data

Removes orphaned data associated with deleted barangays:

```bash
# Dry run to see what would be deleted (recommended first)
node server/src/scripts/cleanupOrphanedBarangayData.js --dry-run

# Verbose dry run with detailed output
node server/src/scripts/cleanupOrphanedBarangayData.js --dry-run --verbose

# Actually perform the cleanup
node server/src/scripts/cleanupOrphanedBarangayData.js

# Verbose cleanup with detailed progress
node server/src/scripts/cleanupOrphanedBarangayData.js --verbose
```

**What it cleans up:**
- Residents without valid barangay references
- Resident classifications
- Family members and families
- Households
- Pets
- Vaccines
- Requests (both by resident and by barangay)
- All cascading dependent data

**Safety features:**
- Always run `--dry-run` first to preview changes
- Transaction-based for safe rollback on errors
- Batch processing to avoid database locks
- Comprehensive verification after cleanup

#### Cleanup Orphaned Classifications

Removes orphaned resident classifications:

```bash
# Investigate orphaned classifications
node server/src/scripts/investigateOrphanedClassifications.js

# Dry run
node server/src/scripts/cleanupOrphanedClassifications.js --dry-run

# Perform cleanup
node server/src/scripts/cleanupOrphanedClassifications.js
```

### Performance Monitoring
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'residents';
```

## 🔒 Security Features

### Data Protection
- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Tokens**: Secure authentication with configurable expiration
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries throughout

### Access Control
- **Role-based Access**: Admin and staff roles with different permissions
- **Target-based Access**: Municipality and barangay-level access control
- **Session Management**: Secure session handling

## 📈 Performance Optimization

### Query Optimization
```sql
-- Use EXPLAIN ANALYZE to analyze query performance
EXPLAIN ANALYZE 
SELECT r.*, b.name as barangay_name
FROM residents r
JOIN barangays b ON r.barangay_id = b.id
WHERE b.municipality_id = 1
ORDER BY r.last_name, r.first_name;

-- Optimize with proper indexes
CREATE INDEX idx_residents_barangay_name ON residents(barangay_id, last_name, first_name);
```

### Connection Pooling
```javascript
// Database connection pool configuration
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Caching Strategy
```sql
-- Materialized views for complex queries
CREATE MATERIALIZED VIEW resident_statistics AS
SELECT 
    b.id as barangay_id,
    b.name as barangay_name,
    COUNT(r.id) as total_residents,
    COUNT(CASE WHEN r.gender = 'Male' THEN 1 END) as male_count,
    COUNT(CASE WHEN r.gender = 'Female' THEN 1 END) as female_count
FROM barangays b
LEFT JOIN residents r ON b.id = r.barangay_id
GROUP BY b.id, b.name;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW resident_statistics;
```

## 🔍 Troubleshooting

### Common Issues
1. **Migration fails at step X**
   ```bash
   # Resume from last completed step
   npm run db:migrate -- --resume
   
   # Or skip problematic step and continue
   npm run db:migrate -- --skip-step=X --force
   ```

2. **Database already exists**
   - Migration is idempotent and will skip existing steps automatically

3. **Permission issues**
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE bims_production TO postgres;
   ```

### Environment Variables
Ensure `.env` file has correct database credentials:
```env
PG_USER=postgres
PG_PASSWORD=12345678
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=bims_production
```

## 📊 Statistics and Analytics

### Key Metrics
The system provides comprehensive statistics for:
- **Population Demographics**: Age, gender, civil status distribution
- **Household Statistics**: Total households, infrastructure data
- **Request Processing**: Request types, completion rates, processing times
- **Official Management**: Term tracking, position distribution
- **Inventory Management**: Asset tracking, quantity monitoring

### API Endpoints
The system provides RESTful API endpoints for:
- **Statistics**: `/statistics/*` endpoints for various metrics
- **CRUD Operations**: Full CRUD for all entities
- **Search and Filter**: Advanced search capabilities
- **File Management**: Document and image upload/download
- **Geospatial Queries**: Location-based data retrieval

---

**This database documentation provides comprehensive coverage of the BIMS database design, including schema, relationships, GIS integration, unified migration system, and maintenance procedures.**

*Last updated: September 30, 2025*
