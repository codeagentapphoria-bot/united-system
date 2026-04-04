#!/bin/bash

# Quick script to fix Nginx camera configuration
# This script applies the camera-friendly Nginx configuration without full deployment

set -e

echo "🔧 Fixing Nginx camera configuration..."

# Colors for output
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run with sudo"
    exit 1
fi

# Check if Nginx is installed
if ! command -v nginx >/dev/null 2>&1; then
    print_error "Nginx is not installed"
    exit 1
fi

# Get the current Nginx configuration
if [ ! -f /etc/nginx/sites-available/bims ]; then
    print_error "BIMS Nginx configuration not found"
    print_error "Please run the full deployment script first: ./scripts/deploy.sh"
    exit 1
fi

print_status "Backing up current Nginx configuration..."
cp /etc/nginx/sites-available/bims /etc/nginx/sites-available/bims.backup.$(date +%Y%m%d_%H%M%S)

print_status "Applying camera-friendly Nginx configuration..."

# Fix the Content Security Policy to include camera-src
sed -i 's/connect-src '\''self'\'' ws: wss:;/connect-src '\''self'\'' ws: wss:; camera-src '\''self'\'';/' /etc/nginx/sites-available/bims

# Remove the Permissions-Policy header that blocks camera access
sed -i '/Permissions-Policy/d' /etc/nginx/sites-available/bims

# Add a comment about camera configuration
sed -i '/# Camera-specific headers/a\    # Camera access enabled - Permissions-Policy header removed' /etc/nginx/sites-available/bims

print_status "Testing Nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration test passed"
    
    print_status "Reloading Nginx..."
    if systemctl reload nginx; then
        print_success "Nginx reloaded successfully"
    else
        print_warning "Nginx reload failed, trying restart..."
        systemctl restart nginx
        print_success "Nginx restarted successfully"
    fi
else
    print_error "Nginx configuration test failed"
    print_error "Restoring backup..."
    cp /etc/nginx/sites-available/bims.backup.* /etc/nginx/sites-available/bims
    exit 1
fi

print_success "Camera configuration applied successfully!"
echo ""
echo "📱 Camera access should now work properly:"
echo "• HTTPS required: https://$(hostname -I | awk '{print $1}')"
echo "• Accept self-signed certificate warning"
echo "• Grant camera permissions when prompted"
echo ""
echo "🔧 Changes applied:"
echo "✓ Content-Security-Policy includes camera-src 'self'"
echo "✓ Permissions-Policy header removed"
echo "✓ Nginx configuration reloaded"
echo ""
echo "📋 To test camera functionality:"
echo "1. Go to: https://$(hostname -I | awk '{print $1}')/request"
echo "2. Click 'Scan QR Code' or 'Request Camera Permission'"
echo "3. Allow camera access when prompted"
echo "" 