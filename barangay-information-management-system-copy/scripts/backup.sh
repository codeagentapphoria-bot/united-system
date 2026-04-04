#!/bin/bash

# BIMS Backup Script
# This script creates comprehensive backups of the BIMS application

set -e  # Exit on any error

echo "💾 Starting BIMS Backup Process..."

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
LOG_DIR="$PROJECT_DIR/logs"
BACKUP_LOG="$LOG_DIR/backup-$(date +%Y%m%d_%H%M%S).log"
BUILD_DIR="$PROJECT_DIR/build"

# Create necessary directories
mkdir -p "$LOG_DIR" "$PROJECT_DIR/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output with logging
print_status() {
    local message="[INFO] $1"
    echo -e "${BLUE}$message${NC}"
    log_message "$message"
}

print_success() {
    local message="[SUCCESS] $1"
    echo -e "${GREEN}$message${NC}"
    log_message "$message"
}

print_warning() {
    local message="[WARNING] $1"
    echo -e "${YELLOW}$message${NC}"
    log_message "$message"
}

print_error() {
    local message="[ERROR] $1"
    echo -e "${RED}$message${NC}"
    log_message "$message"
}

# Enhanced logging function with disk space check
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check available disk space (in MB)
    local available_space=$(df -m . | awk 'NR==2 {print $4}')
    
    # If less than 100MB available, skip logging to avoid disk full errors
    if [ "$available_space" -lt 100 ]; then
        echo -e "${YELLOW}[WARNING] Low disk space (${available_space}MB available). Skipping log write.${NC}" >&2
        return 0
    fi
    
    # Try to write to log file, but don't fail if disk is full
    echo "[$timestamp] $message" >> "$BACKUP_LOG" 2>/dev/null || {
        echo -e "${YELLOW}[WARNING] Failed to write to log file. Continuing without logging.${NC}" >&2
    }
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check disk space before backup
check_disk_space() {
    print_status "Checking disk space before backup..."
    
    # Get available disk space in MB
    local available_space=$(df -m . | awk 'NR==2 {print $4}')
    local total_space=$(df -m . | awk 'NR==2 {print $2}')
    local used_percent=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    
    print_status "Available disk space: ${available_space}MB / ${total_space}MB (${used_percent}% used)"
    
    # Warn if disk usage is high
    if [ "$available_space" -lt 1000 ]; then
        print_warning "Low disk space detected (${available_space}MB available)"
        print_warning "Backup may fail or be incomplete"
    fi
    
    # Critical warning if very low space
    if [ "$available_space" -lt 500 ]; then
        print_error "Critical: Very low disk space (${available_space}MB available)"
        print_error "Backup will likely fail. Please free up space first."
        return 1
    fi
    
    print_success "Disk space check completed"
}

# Create backup directory structure
create_backup_structure() {
    print_status "Creating backup directory structure..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Create subdirectories for different backup types
    mkdir -p "$BACKUP_DIR/frontend"
    mkdir -p "$BACKUP_DIR/backend"
    mkdir -p "$BACKUP_DIR/config"
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/logs"
    
    print_success "Backup directory structure created at $BACKUP_DIR"
}

# Backup frontend files
backup_frontend() {
    print_status "Backing up frontend files..."
    
    # Backup build directory if it exists
    if [[ -d "$BUILD_DIR" ]]; then
        print_status "Backing up frontend build files..."
        cp -r "$BUILD_DIR" "$BACKUP_DIR/frontend/" || {
            print_error "Failed to backup frontend build files"
            return 1
        }
        print_success "Frontend build files backed up"
    else
        print_warning "Frontend build directory not found, skipping..."
    fi
    
    # Backup client source code
    if [[ -d "$PROJECT_DIR/client" ]]; then
        print_status "Backing up client source code..."
        cp -r "$PROJECT_DIR/client" "$BACKUP_DIR/frontend/" || {
            print_error "Failed to backup client source code"
            return 1
        }
        print_success "Client source code backed up"
    else
        print_warning "Client directory not found, skipping..."
    fi
}

# Backup backend files
backup_backend() {
    print_status "Backing up backend files..."
    
    # Backup server source code
    if [[ -d "$PROJECT_DIR/server" ]]; then
        print_status "Backing up server source code..."
        cp -r "$PROJECT_DIR/server" "$BACKUP_DIR/backend/" || {
            print_error "Failed to backup server source code"
            return 1
        }
        print_success "Server source code backed up"
    else
        print_warning "Server directory not found, skipping..."
    fi
}

# Backup configuration files
backup_config() {
    print_status "Backing up configuration files..."
    
    # Backup environment files
    print_status "Backing up environment files..."
    if [[ -f "$PROJECT_DIR/server/.env.production" ]]; then
        cp "$PROJECT_DIR/server/.env.production" "$BACKUP_DIR/config/" || {
            print_warning "Failed to backup .env.production"
        }
    fi
    if [[ -f "$PROJECT_DIR/server/.env" ]]; then
        cp "$PROJECT_DIR/server/.env" "$BACKUP_DIR/config/" || {
            print_warning "Failed to backup .env"
        }
    fi
    if [[ -f "$PROJECT_DIR/client/.env" ]]; then
        cp "$PROJECT_DIR/client/.env" "$BACKUP_DIR/config/" || {
            print_warning "Failed to backup client .env"
        }
    fi
    
    # Backup package.json files
    if [[ -f "$PROJECT_DIR/package.json" ]]; then
        cp "$PROJECT_DIR/package.json" "$BACKUP_DIR/config/" || {
            print_warning "Failed to backup root package.json"
        }
    fi
    if [[ -f "$PROJECT_DIR/client/package.json" ]]; then
        cp "$PROJECT_DIR/client/package.json" "$BACKUP_DIR/config/" || {
            print_warning "Failed to backup client package.json"
        }
    fi
    if [[ -f "$PROJECT_DIR/server/package.json" ]]; then
        cp "$PROJECT_DIR/server/package.json" "$BACKUP_DIR/config/" || {
            print_warning "Failed to backup server package.json"
        }
    fi
    
    # Backup ecosystem.config.cjs if it exists
    if [[ -f "$PROJECT_DIR/server/ecosystem.config.cjs" ]]; then
        cp "$PROJECT_DIR/server/ecosystem.config.cjs" "$BACKUP_DIR/config/" || {
            print_warning "Failed to backup ecosystem.config.cjs"
        }
    fi
    
    # Backup Nginx configuration if it exists
    if [[ -f "/etc/nginx/sites-available/bims" ]]; then
        sudo cp "/etc/nginx/sites-available/bims" "$BACKUP_DIR/config/nginx-bims.conf" || {
            print_warning "Failed to backup Nginx configuration"
        }
    fi
    
    print_success "Configuration files backed up"
}

# Backup database
backup_database() {
    print_status "Backing up database..."
    
    # Check if PostgreSQL is available
    if command_exists psql; then
        # Get database connection details from environment
        local db_name="bims_production"
        local db_user="postgres"
        
        # Try to get database details from .env file
        if [[ -f "$PROJECT_DIR/server/.env.production" ]]; then
            source "$PROJECT_DIR/server/.env.production"
            db_name="${DB_NAME:-bims_production}"
            db_user="${DB_USER:-postgres}"
        elif [[ -f "$PROJECT_DIR/server/.env" ]]; then
            source "$PROJECT_DIR/server/.env"
            db_name="${DB_NAME:-bims_production}"
            db_user="${DB_USER:-postgres}"
        fi
        
        print_status "Backing up database: $db_name"
        
        # Create database backup
        if pg_dump -h localhost -U "$db_user" -d "$db_name" > "$BACKUP_DIR/database/bims_production_backup.sql" 2>/dev/null; then
            print_success "Database backup completed"
        else
            print_warning "Database backup failed, but continuing..."
        fi
        
        # Create database schema backup
        if pg_dump -h localhost -U "$db_user" -d "$db_name" --schema-only > "$BACKUP_DIR/database/bims_production_schema.sql" 2>/dev/null; then
            print_success "Database schema backup completed"
        else
            print_warning "Database schema backup failed, but continuing..."
        fi
    else
        print_warning "PostgreSQL not available, skipping database backup"
    fi
}

# Backup logs
backup_logs() {
    print_status "Backing up logs..."
    
    # Backup application logs
    if [[ -d "$PROJECT_DIR/server/logs" ]]; then
        print_status "Backing up application logs..."
        cp -r "$PROJECT_DIR/server/logs" "$BACKUP_DIR/logs/" || {
            print_warning "Failed to backup application logs"
        }
        print_success "Application logs backed up"
    else
        print_warning "Application logs directory not found, skipping..."
    fi
    
    # Backup PM2 logs if available
    if command_exists pm2; then
        print_status "Backing up PM2 logs..."
        pm2 logs --lines 1000 > "$BACKUP_DIR/logs/pm2_logs.txt" 2>/dev/null || {
            print_warning "Failed to backup PM2 logs"
        }
        print_success "PM2 logs backed up"
    fi
}

# Create backup metadata
create_backup_metadata() {
    print_status "Creating backup metadata..."
    
    cat > "$BACKUP_DIR/BACKUP_INFO.md" <<EOF
# BIMS Backup Information

**Backup Date:** $(date)
**Backup Directory:** $BACKUP_DIR
**Backup Type:** Comprehensive Application Backup

## System Information
- **OS:** $(uname -a)
- **Node Version:** $(node --version 2>/dev/null || echo "Unknown")
- **NPM Version:** $(npm --version 2>/dev/null || echo "Unknown")
- **Git Commit:** $(git rev-parse --short HEAD 2>/dev/null || echo "Unknown")

## Backup Contents
- **Frontend:** Client source code and build files
- **Backend:** Server source code and configuration
- **Database:** PostgreSQL database dump and schema
- **Configuration:** Environment files and system configs
- **Logs:** Application and system logs

## Backup Size
- **Total Size:** $(du -sh "$BACKUP_DIR" | cut -f1)

## Restoration Instructions

### 1. Restore Frontend
\`\`\`bash
# Restore client source code
cp -r $BACKUP_DIR/frontend/client/* /path/to/new/client/

# Restore build files
cp -r $BACKUP_DIR/frontend/build/* /path/to/new/build/
\`\`\`

### 2. Restore Backend
\`\`\`bash
# Restore server source code
cp -r $BACKUP_DIR/backend/server/* /path/to/new/server/

# Restore configuration files
cp $BACKUP_DIR/config/*.env* /path/to/new/server/
cp $BACKUP_DIR/config/ecosystem.config.cjs /path/to/new/server/
\`\`\`

### 3. Restore Database
\`\`\`bash
# Restore database schema and data
psql -h localhost -U postgres -d bims_production < $BACKUP_DIR/database/bims_production_backup.sql
\`\`\`

### 4. Restore Nginx Configuration
\`\`\`bash
# Restore Nginx configuration
sudo cp $BACKUP_DIR/config/nginx-bims.conf /etc/nginx/sites-available/bims
sudo ln -sf /etc/nginx/sites-available/bims /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
\`\`\`

## Verification
After restoration, verify the following:
1. Application starts successfully
2. Database connections work
3. Frontend loads correctly
4. API endpoints respond
5. Camera functionality works (HTTPS required)

## Notes
- This backup was created on $(date)
- Backup location: $BACKUP_DIR
- Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)
EOF
    
    print_success "Backup metadata created"
}

# Cleanup old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups..."
    
    # Keep only the 10 most recent backups
    if [ -d "$PROJECT_DIR/backups" ]; then
        local backup_count=$(ls -1 "$PROJECT_DIR/backups/" 2>/dev/null | wc -l)
        if [ "$backup_count" -gt 10 ]; then
            print_status "Removing old backup directories..."
            ls -1t "$PROJECT_DIR/backups/" | tail -n +11 | xargs -I {} rm -rf "$PROJECT_DIR/backups/{}" 2>/dev/null || true
            print_success "Removed $(($backup_count - 10)) old backup directories"
        fi
    fi
}

# Create backup archive
create_backup_archive() {
    print_status "Creating backup archive..."
    
    local archive_name="bims_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    local archive_path="$PROJECT_DIR/backups/$archive_name"
    
    # Create compressed archive
    if tar -czf "$archive_path" -C "$PROJECT_DIR/backups" "$(basename "$BACKUP_DIR")" 2>/dev/null; then
        print_success "Backup archive created: $archive_name"
        
        # Calculate archive size
        local archive_size=$(du -sh "$archive_path" | cut -f1)
        print_status "Archive size: $archive_size"
        
        # Optionally remove the uncompressed backup directory
        read -p "Remove uncompressed backup directory to save space? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$BACKUP_DIR"
            print_success "Uncompressed backup directory removed"
        fi
    else
        print_warning "Failed to create backup archive, keeping uncompressed backup"
    fi
}

# Main backup function
main() {
    echo "💾 BIMS Backup Process"
    echo "====================="
    
    local backup_start_time=$(date +%s)
    local backup_errors=0
    
    # Run each step with error handling
    print_status "Starting backup process..."
    
    # Phase 1: Pre-backup checks
    print_status "Phase 1: Pre-backup checks"
    check_disk_space || ((backup_errors++))
    
    # Phase 2: Backup preparation
    print_status "Phase 2: Backup preparation"
    create_backup_structure || ((backup_errors++))
    
    # Phase 3: Application backup
    print_status "Phase 3: Application backup"
    backup_frontend || ((backup_errors++))
    backup_backend || ((backup_errors++))
    backup_config || ((backup_errors++))
    backup_database || ((backup_errors++))
    backup_logs || ((backup_errors++))
    
    # Phase 4: Backup finalization
    print_status "Phase 4: Backup finalization"
    create_backup_metadata || ((backup_errors++))
    cleanup_old_backups || ((backup_errors++))
    
    # Phase 5: Create archive (optional)
    print_status "Phase 5: Create archive (optional)"
    read -p "Create compressed archive? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_backup_archive || ((backup_errors++))
    fi
    
    # Calculate backup duration
    local backup_end_time=$(date +%s)
    local backup_duration=$((backup_end_time - backup_start_time))
    
    echo ""
    if [ $backup_errors -eq 0 ]; then
        echo "🎉 Backup completed successfully!"
        echo "⏱️  Total backup time: ${backup_duration} seconds"
    else
        echo "⚠️ Backup completed with $backup_errors warnings/errors"
        echo "Check the logs above for details. Your backup may still be functional."
        echo "📄 Detailed logs available at: $BACKUP_LOG"
    fi
    
    # Display backup information
    echo ""
    echo "📁 Backup Information:"
    echo "Backup Location: $BACKUP_DIR"
    echo "Backup Size: $(du -sh "$BACKUP_DIR" | cut -f1)"
    echo "Log File: $BACKUP_LOG"
    echo ""
    echo "📋 Backup Contents:"
    echo "• Frontend files and build"
    echo "• Backend source code"
    echo "• Configuration files"
    echo "• Database dump and schema"
    echo "• Application logs"
    echo "• System metadata"
    echo ""
    echo "📖 Restoration Guide:"
    echo "See BACKUP_INFO.md in the backup directory for detailed restoration instructions."
    
    return $backup_errors
}

# Run main function
main "$@"
