#!/bin/bash

# Setup automatic cleanup cron job for orphaned files
# This script sets up a weekly cleanup job to remove orphaned files

SCRIPT_DIR="/home/ubuntu/BIMS/server/src/scripts"
CLEANUP_SCRIPT="$SCRIPT_DIR/cleanupOrphanedFiles.js"
LOG_FILE="/home/ubuntu/BIMS/logs/cleanup.log"

# Create logs directory if it doesn't exist
mkdir -p /home/ubuntu/BIMS/logs

# Create the cron job entry
CRON_JOB="0 2 * * 0 cd /home/ubuntu/BIMS/server && node $CLEANUP_SCRIPT >> $LOG_FILE 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "cleanupOrphanedFiles.js"; then
    echo "✅ Cleanup cron job already exists"
    echo "Current cleanup cron jobs:"
    crontab -l 2>/dev/null | grep "cleanupOrphanedFiles.js"
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cleanup cron job added successfully"
    echo "The cleanup will run every Sunday at 2:00 AM"
fi

echo ""
echo "📋 Cron job details:"
echo "  - Schedule: Every Sunday at 2:00 AM"
echo "  - Script: $CLEANUP_SCRIPT"
echo "  - Log file: $LOG_FILE"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove this cron job: crontab -e (then delete the line)"
echo "To run cleanup manually: node $CLEANUP_SCRIPT"




