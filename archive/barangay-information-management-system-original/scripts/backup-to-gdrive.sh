#!/bin/bash

# BIMS Database and Uploads Backup Script with Google Drive Integration
# This script creates compressed backups and uploads them to Google Drive

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/home/ubuntu/BIMS/backups"
DB_NAME="bims_production"
UPLOADS_DIR="/home/ubuntu/BIMS/server/uploads"
GDRIVE_FOLDER_ID="your_google_drive_folder_id"  # Replace with your Google Drive folder ID
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="bims_backup_${DATE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting BIMS backup process..."

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
log "Creating uploads backup with compression..."
UPLOADS_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_uploads.tar.gz"

# Create compressed archive of uploads directory
tar -czf "$UPLOADS_BACKUP_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"

if [ $? -eq 0 ]; then
    log "Uploads backup created: $UPLOADS_BACKUP_FILE"
else
    error "Uploads backup failed!"
    exit 1
fi

# 3. Create combined backup archive
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

# 4. Get file sizes for reporting
DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
UPLOADS_SIZE=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
COMBINED_SIZE=$(du -h "$COMBINED_BACKUP_FILE" | cut -f1)

log "Backup sizes:"
log "  Database: $DB_SIZE"
log "  Uploads: $UPLOADS_SIZE"
log "  Combined: $COMBINED_SIZE"

# 5. Upload to Google Drive (if gdrive is configured)
if command -v gdrive &> /dev/null; then
    log "Uploading to Google Drive..."
    
    # Upload combined backup
    gdrive upload --parent "$GDRIVE_FOLDER_ID" "$COMBINED_BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        log "Successfully uploaded to Google Drive!"
    else
        warning "Google Drive upload failed, but local backup is available"
    fi
else
    warning "gdrive CLI not found. Install it to enable Google Drive upload:"
    warning "  wget https://github.com/gdrive-org/gdrive/releases/download/2.1.1/gdrive_2.1.1_linux_386.tar.gz"
    warning "  tar -xzf gdrive_2.1.1_linux_386.tar.gz"
    warning "  sudo mv gdrive /usr/local/bin/"
fi

# 6. Cleanup old backups (keep last 7 days)
log "Cleaning up old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "bims_backup_*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "bims_backup_*.sql" -mtime +7 -delete

log "Backup process completed successfully!"
log "Files created:"
log "  - Database: $DB_BACKUP_FILE"
log "  - Uploads: $UPLOADS_BACKUP_FILE"
log "  - Combined: $COMBINED_BACKUP_FILE"

# 7. Optional: Create restore script
RESTORE_SCRIPT="${BACKUP_DIR}/restore_${BACKUP_NAME}.sh"
cat > "$RESTORE_SCRIPT" << EOF
#!/bin/bash
# Restore script for backup: $BACKUP_NAME
# Generated on: $(date)

set -e

echo "Restoring BIMS backup: $BACKUP_NAME"
echo "This will restore the database and uploads from: $(date)"

# Extract the backup
tar -xzf "$COMBINED_BACKUP_FILE" -C "$BACKUP_DIR"

# Restore database
echo "Restoring database..."
sudo -u postgres psql -d bims_production -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
sudo -u postgres psql -d bims_production < "$BACKUP_DIR/${BACKUP_NAME}_database.sql"

# Restore uploads
echo "Restoring uploads..."
tar -xzf "$BACKUP_DIR/${BACKUP_NAME}_uploads.tar.gz" -C "$(dirname "$UPLOADS_DIR")"

echo "Restore completed successfully!"
EOF

chmod +x "$RESTORE_SCRIPT"
log "Restore script created: $RESTORE_SCRIPT"

log "Backup process completed successfully!"
