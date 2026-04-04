#!/bin/bash

# BIMS Environment Files Backup Script
# This script backs up your existing .env files before running setup/deploy

set -e

# Get the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Create backup directory with timestamp
BACKUP_DIR="$PROJECT_DIR/backups/env-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "🔒 BIMS Environment Files Backup"
echo "================================"

# Backup server .env files
if [ -f "$PROJECT_DIR/server/.env" ]; then
    print_status "Backing up server/.env..."
    cp "$PROJECT_DIR/server/.env" "$BACKUP_DIR/server.env"
    print_success "Server .env backed up"
else
    print_warning "No server/.env file found"
fi

if [ -f "$PROJECT_DIR/server/.env.production" ]; then
    print_status "Backing up server/.env.production..."
    cp "$PROJECT_DIR/server/.env.production" "$BACKUP_DIR/server.env.production"
    print_success "Server .env.production backed up"
else
    print_warning "No server/.env.production file found"
fi

# Backup client .env file
if [ -f "$PROJECT_DIR/client/.env" ]; then
    print_status "Backing up client/.env..."
    cp "$PROJECT_DIR/client/.env" "$BACKUP_DIR/client.env"
    print_success "Client .env backed up"
else
    print_warning "No client/.env file found"
fi

# Create restore script
cat > "$BACKUP_DIR/restore-env.sh" << 'EOF'
#!/bin/bash
# Restore script for BIMS environment files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔄 Restoring BIMS Environment Files"
echo "==================================="

# Restore server .env
if [ -f "$SCRIPT_DIR/server.env" ]; then
    echo "Restoring server/.env..."
    cp "$SCRIPT_DIR/server.env" "$PROJECT_DIR/server/.env"
    echo "✅ Server .env restored"
fi

# Restore server .env.production
if [ -f "$SCRIPT_DIR/server.env.production" ]; then
    echo "Restoring server/.env.production..."
    cp "$SCRIPT_DIR/server.env.production" "$PROJECT_DIR/server/.env.production"
    echo "✅ Server .env.production restored"
fi

# Restore client .env
if [ -f "$SCRIPT_DIR/client.env" ]; then
    echo "Restoring client/.env..."
    cp "$SCRIPT_DIR/client.env" "$PROJECT_DIR/client/.env"
    echo "✅ Client .env restored"
fi

echo "🎉 Environment files restored successfully!"
echo "📁 Backup location: $SCRIPT_DIR"
EOF

chmod +x "$BACKUP_DIR/restore-env.sh"

print_success "Environment files backup completed!"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo "🔄 To restore: $BACKUP_DIR/restore-env.sh"
echo ""
echo "📋 Backed up files:"
ls -la "$BACKUP_DIR" | grep -v "^total" | awk '{print "  " $9 " (" $5 " bytes)"}'
