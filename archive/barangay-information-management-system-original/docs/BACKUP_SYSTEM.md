# BIMS Backup System Documentation

## Overview
This backup system provides automated backup solutions for the BIMS application, including database and file uploads with compression and Google Drive integration.

## Backup Components

### 1. Database Backup
- **Source**: PostgreSQL database `bims_production`
- **Format**: SQL dump file
- **Compression**: Included in tar.gz archive

### 2. Uploads Backup
- **Source**: `/home/ubuntu/BIMS/server/uploads/` directory
- **Includes**: All uploaded files (residents, households, pets, etc.)
- **Compression**: tar.gz format for significant space savings

## Available Scripts

### Quick Backup (Immediate Use)
```bash
/home/ubuntu/BIMS/scripts/quick-backup.sh
```
- Creates local backups only
- No Google Drive dependency
- Perfect for immediate backup needs

### Google Drive Backup (Automated)
```bash
/home/ubuntu/BIMS/scripts/backup-to-gdrive.sh
```
- Creates local backups
- Uploads to Google Drive automatically
- Includes cleanup of old backups (7 days retention)

### Google Drive Setup
```bash
/home/ubuntu/BIMS/scripts/setup-gdrive-backup.sh
```
- Installs and configures gdrive CLI
- Provides authentication instructions

## Backup File Structure

```
/home/ubuntu/BIMS/backups/
├── bims_backup_YYYYMMDD_HHMMSS_database.sql
├── bims_backup_YYYYMMDD_HHMMSS_uploads.tar.gz
├── bims_backup_YYYYMMDD_HHMMSS_complete.tar.gz
└── restore_YYYYMMDD_HHMMSS.sh
```

## Setup Instructions

### 1. Quick Local Backup
```bash
# Run immediately - no setup required
/home/ubuntu/BIMS/scripts/quick-backup.sh
```

### 2. Google Drive Integration

#### Step 1: Install Google Drive CLI
```bash
/home/ubuntu/BIMS/scripts/setup-gdrive-backup.sh
```

#### Step 2: Authenticate with Google Drive
```bash
gdrive about
# Follow the browser authentication process
```

#### Step 3: Create Google Drive Folder
1. Go to your Google Drive
2. Create a new folder (e.g., "BIMS_Backups")
3. Copy the folder ID from the URL
4. Edit `/home/ubuntu/BIMS/scripts/backup-to-gdrive.sh`
5. Replace `your_google_drive_folder_id` with your actual folder ID

#### Step 4: Run Automated Backup
```bash
/home/ubuntu/BIMS/scripts/backup-to-gdrive.sh
```

## Compression Benefits

### Uploads Compression
- **Before**: Raw files (can be several GB)
- **After**: Compressed tar.gz (typically 60-80% size reduction)
- **Example**: 2GB uploads → 400MB compressed

### Database Compression
- **Before**: SQL dump (can be 100MB+)
- **After**: Included in compressed archive
- **Example**: 150MB SQL → 30MB in archive

## Automated Scheduling

### Using Cron (Recommended)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/BIMS/scripts/backup-to-gdrive.sh

# Add weekly backup on Sundays at 3 AM
0 3 * * 0 /home/ubuntu/BIMS/scripts/backup-to-gdrive.sh
```

### Using Systemd Timer (Alternative)
```bash
# Create service file
sudo nano /etc/systemd/system/bims-backup.service

# Create timer file
sudo nano /etc/systemd/system/bims-backup.timer

# Enable and start timer
sudo systemctl enable bims-backup.timer
sudo systemctl start bims-backup.timer
```

## Restore Process

### Automatic Restore Script
Each backup creates a restore script:
```bash
# Example restore script
/home/ubuntu/BIMS/backups/restore_bims_backup_20241201_143022.sh
```

### Manual Restore
```bash
# 1. Extract the backup
tar -xzf bims_backup_YYYYMMDD_HHMMSS_complete.tar.gz

# 2. Restore database
sudo -u postgres psql -d bims_production < database.sql

# 3. Restore uploads
tar -xzf uploads.tar.gz -C /home/ubuntu/BIMS/server/
```

## Monitoring and Maintenance

### Check Backup Status
```bash
# List recent backups
ls -la /home/ubuntu/BIMS/backups/

# Check backup sizes
du -h /home/ubuntu/BIMS/backups/
```

### Cleanup Old Backups
```bash
# Manual cleanup (keep last 7 days)
find /home/ubuntu/BIMS/backups/ -name "bims_backup_*" -mtime +7 -delete
```

### Verify Backup Integrity
```bash
# Test database backup
sudo -u postgres psql -d bims_production -c "SELECT COUNT(*) FROM residents;"

# Test uploads backup
tar -tzf uploads.tar.gz | head -10
```

## Security Considerations

### File Permissions
```bash
# Secure backup files
chmod 600 /home/ubuntu/BIMS/backups/*.sql
chmod 600 /home/ubuntu/BIMS/backups/*.tar.gz
```

### Google Drive Security
- Authentication tokens stored in `~/.gdrive/`
- Keep credentials secure
- Consider using service account for production

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql -d bims_production -c "SELECT 1;"
```

#### 2. Google Drive Upload Failed
```bash
# Re-authenticate
gdrive about

# Check folder ID
gdrive list
```

#### 3. Insufficient Disk Space
```bash
# Check disk usage
df -h

# Clean old backups
find /home/ubuntu/BIMS/backups/ -mtime +7 -delete
```

### Log Files
- Backup logs: Check terminal output
- System logs: `/var/log/syslog`
- Application logs: `/home/ubuntu/BIMS/logs/`

## Best Practices

1. **Regular Testing**: Test restore process monthly
2. **Multiple Locations**: Keep backups in multiple locations
3. **Encryption**: Consider encrypting sensitive backups
4. **Monitoring**: Set up alerts for backup failures
5. **Documentation**: Keep backup procedures documented

## Support

For issues with the backup system:
1. Check the troubleshooting section above
2. Review log files for error messages
3. Test individual components (database, uploads, Google Drive)
4. Contact system administrator if needed
