#!/bin/bash

# Log Cleanup Script for BIMS
# This script safely cleans up old log files while preserving recent ones

LOG_DIR="/home/ubuntu/BIMS/server/logs"
BACKUP_DIR="/home/ubuntu/BIMS/server/logs/backup-$(date +%Y%m%d-%H%M%S)"

echo "🧹 Starting BIMS Log Cleanup..."
echo "📁 Log directory: $LOG_DIR"
echo "📦 Backup directory: $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Show current size
echo "📊 Current log directory size:"
du -sh "$LOG_DIR"
echo ""

# 1. Clean up old compressed logs (older than 7 days)
echo "🗜️  Cleaning old compressed logs (older than 7 days)..."
OLD_COMPRESSED=$(find "$LOG_DIR" -name "*.log.gz" -mtime +7 | wc -l)
if [ "$OLD_COMPRESSED" -gt 0 ]; then
    echo "   Found $OLD_COMPRESSED old compressed log files"
    find "$LOG_DIR" -name "*.log.gz" -mtime +7 -exec mv {} "$BACKUP_DIR/" \;
    echo "   ✅ Moved $OLD_COMPRESSED files to backup"
else
    echo "   ✅ No old compressed logs to clean"
fi

# 2. Clean up old uncompressed logs (older than 7 days, except current day)
echo ""
echo "📄 Cleaning old uncompressed logs (older than 7 days)..."
TODAY=$(date +%Y-%m-%d)
OLD_UNCOMPRESSED=$(find "$LOG_DIR" -name "*.log" -not -name "*$TODAY*" -mtime +7 | wc -l)
if [ "$OLD_UNCOMPRESSED" -gt 0 ]; then
    echo "   Found $OLD_UNCOMPRESSED old uncompressed log files"
    find "$LOG_DIR" -name "*.log" -not -name "*$TODAY*" -mtime +7 -exec mv {} "$BACKUP_DIR/" \;
    echo "   ✅ Moved $OLD_UNCOMPRESSED files to backup"
else
    echo "   ✅ No old uncompressed logs to clean"
fi

# 3. Rotate large PM2 logs (keep only last 1000 lines)
echo ""
echo "🔄 Rotating large PM2 logs..."
for pm2_log in "$LOG_DIR"/pm2-*.log; do
    if [ -f "$pm2_log" ]; then
        SIZE=$(stat -c%s "$pm2_log")
        SIZE_MB=$((SIZE / 1024 / 1024))
        if [ "$SIZE_MB" -gt 1 ]; then
            echo "   📝 Rotating $pm2_log (${SIZE_MB}MB)"
            tail -n 1000 "$pm2_log" > "$pm2_log.tmp"
            mv "$pm2_log.tmp" "$pm2_log"
            echo "   ✅ Rotated $pm2_log"
        fi
    fi
done

# 4. Clean up large combined.log (keep only last 1000 lines)
echo ""
echo "📋 Rotating combined.log..."
if [ -f "$LOG_DIR/combined.log" ]; then
    SIZE=$(stat -c%s "$LOG_DIR/combined.log")
    SIZE_MB=$((SIZE / 1024 / 1024))
    if [ "$SIZE_MB" -gt 2 ]; then
        echo "   📝 Rotating combined.log (${SIZE_MB}MB)"
        tail -n 1000 "$LOG_DIR/combined.log" > "$LOG_DIR/combined.log.tmp"
        mv "$LOG_DIR/combined.log.tmp" "$LOG_DIR/combined.log"
        echo "   ✅ Rotated combined.log"
    else
        echo "   ✅ combined.log size is acceptable (${SIZE_MB}MB)"
    fi
fi

# 5. Clean up audit files (keep only recent ones)
echo ""
echo "🔍 Cleaning old audit files..."
AUDIT_FILES=$(find "$LOG_DIR" -name ".audit.json" -mtime +3 | wc -l)
if [ "$AUDIT_FILES" -gt 0 ]; then
    echo "   Found $AUDIT_FILES old audit files"
    find "$LOG_DIR" -name ".audit.json" -mtime +3 -exec mv {} "$BACKUP_DIR/" \;
    echo "   ✅ Moved $AUDIT_FILES audit files to backup"
else
    echo "   ✅ No old audit files to clean"
fi

# 6. Compress backup directory
echo ""
echo "📦 Compressing backup..."
if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR")" ]; then
    tar -czf "$BACKUP_DIR.tar.gz" -C "$LOG_DIR" "$(basename "$BACKUP_DIR")"
    rm -rf "$BACKUP_DIR"
    echo "   ✅ Backup compressed to $BACKUP_DIR.tar.gz"
else
    echo "   ✅ No backup files to compress"
fi

# Show final results
echo ""
echo "📊 Final log directory size:"
du -sh "$LOG_DIR"

echo ""
echo "📁 Remaining log files:"
ls -lah "$LOG_DIR"/*.log* 2>/dev/null | head -10

echo ""
echo "🎉 Log cleanup completed successfully!"
echo "💾 Backup created: $BACKUP_DIR.tar.gz"
