#!/bin/bash

# Setup script for Google Drive backup integration
# This script installs and configures gdrive CLI for automated backups

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log "Setting up Google Drive backup integration..."

# Check if gdrive is already installed
if command -v gdrive &> /dev/null; then
    log "gdrive CLI is already installed"
    gdrive version
else
    log "Installing gdrive CLI..."
    
    # Download and install gdrive
    cd /tmp
    wget https://github.com/gdrive-org/gdrive/releases/download/2.1.1/gdrive_2.1.1_linux_386.tar.gz
    tar -xzf gdrive_2.1.1_linux_386.tar.gz
    sudo mv gdrive /usr/local/bin/
    sudo chmod +x /usr/local/bin/gdrive
    
    log "gdrive CLI installed successfully"
fi

log "Google Drive setup instructions:"
echo ""
info "1. First, you need to authenticate with Google Drive:"
info "   Run: gdrive about"
info "   This will open a browser window for authentication"
echo ""
info "2. Create a folder in Google Drive for your backups:"
info "   - Go to your Google Drive"
info "   - Create a new folder (e.g., 'BIMS_Backups')"
info "   - Note the folder ID from the URL"
echo ""
info "3. Update the backup script with your folder ID:"
info "   Edit: /home/ubuntu/BIMS/scripts/backup-to-gdrive.sh"
info "   Replace 'your_google_drive_folder_id' with your actual folder ID"
echo ""
info "4. Test the backup:"
info "   Run: /home/ubuntu/BIMS/scripts/backup-to-gdrive.sh"
echo ""
warning "Important: Keep your Google Drive credentials secure!"
warning "The authentication token is stored in ~/.gdrive/"

log "Setup completed! Follow the instructions above to complete the configuration."
