#!/bin/bash

# Quick BIMS Backup Script (Local only)
# Creates compressed backups of database and uploads

set -e

# Configuration
BACKUP_DIR="/home/ubuntu/BIMS/backups"
DB_NAME="bims_production"
UPLOADS_DIR="/home/ubuntu/BIMS/server/uploads"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="bims_backup_${DATE}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting quick backup process..."

# 1. Database Backup
log "Creating database backup..."
DB_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_database.sql"
sudo -u postgres pg_dump -d "$DB_NAME" > "$DB_BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Database backup created: $DB_BACKUP_FILE"
else
    error "Database backup failed!"
    exit 1
fi

# 2. Uploads Backup with Compression
log "Creating compressed uploads backup..."
UPLOADS_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_uploads.tar.gz"

tar -czf "$UPLOADS_BACKUP_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"

if [ $? -eq 0 ]; then
    log "Uploads backup created: $UPLOADS_BACKUP_FILE"
else
    error "Uploads backup failed!"
    exit 1
fi

# 3. Create combined backup
log "Creating combined backup archive..."
COMBINED_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_complete.tar.gz"

tar -czf "$COMBINED_BACKUP_FILE" \
    -C "$BACKUP_DIR" \
    "${BACKUP_NAME}_database.sql" \
    "${BACKUP_NAME}_uploads.tar.gz"

if [ $? -eq 0 ]; then
    log "Combined backup created: $COMBINED_BACKUP_FILE"
else
    error "Combined backup failed!"
    exit 1
fi

# 4. Show file sizes
DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
UPLOADS_SIZE=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
COMBINED_SIZE=$(du -h "$COMBINED_BACKUP_FILE" | cut -f1)

log "Backup completed successfully!"
log "File sizes:"
log "  Database: $DB_SIZE"
log "  Uploads: $UPLOADS_SIZE"
log "  Combined: $COMBINED_SIZE"
log ""
log "Backup files:"
log "  - $DB_BACKUP_FILE"
log "  - $UPLOADS_BACKUP_FILE"
log "  - $COMBINED_BACKUP_FILE"
log ""
warning "To upload to Google Drive, run: /home/ubuntu/BIMS/scripts/setup-gdrive-backup.sh first"
