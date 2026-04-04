#!/bin/bash

# BIMS Mixed Content Fix Script
# This script fixes HTTPS/HTTP mixed content issues

set -e

# Get the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get the instance IP
INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}')

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

echo "🔒 BIMS Mixed Content Fix"
echo "========================"
echo "Detected IP: $INSTANCE_IP"
echo ""

# Fix client .env
if [ -f "$PROJECT_DIR/client/.env" ]; then
    print_status "Fixing client .env Mixed Content issues..."
    
    # Backup original .env
    cp "$PROJECT_DIR/client/.env" "$PROJECT_DIR/client/.env.backup.$(date +%Y%m%d_%H%M%S)"
    print_status "Backed up original .env to .env.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update API URLs to use HTTPS
    sed -i "s|VITE_API_BASE_URL=http://|VITE_API_BASE_URL=https://|g" "$PROJECT_DIR/client/.env"
    sed -i "s|VITE_SERVER_URL=http://|VITE_SERVER_URL=https://|g" "$PROJECT_DIR/client/.env"
    
        # Update specific IP addresses to use HTTPS (remove port 5000)
        sed -i "s|http://$INSTANCE_IP:5000|https://$INSTANCE_IP|g" "$PROJECT_DIR/client/.env"
        sed -i "s|https://$INSTANCE_IP:5000|https://$INSTANCE_IP|g" "$PROJECT_DIR/client/.env"
        sed -i "s|http://$INSTANCE_IP/api|https://$INSTANCE_IP/api|g" "$PROJECT_DIR/client/.env"
    
    print_success "Client .env updated to use HTTPS endpoints"
    
    # Show the changes
    echo ""
    print_status "Updated client .env API URLs:"
    grep -E "VITE_API_BASE_URL|VITE_SERVER_URL" "$PROJECT_DIR/client/.env" || true
else
    print_warning "Client .env file not found"
fi

echo ""

# Fix server CORS
if [ -f "$PROJECT_DIR/server/.env.production" ]; then
    print_status "Fixing server CORS for HTTPS origins..."
    
    # Update CORS origin to use HTTPS
    sed -i "s|CORS_ORIGIN=http://|CORS_ORIGIN=https://|g" "$PROJECT_DIR/server/.env.production"
    sed -i "s|CORS_ORIGIN=http://$INSTANCE_IP|CORS_ORIGIN=https://$INSTANCE_IP|g" "$PROJECT_DIR/server/.env.production"
    sed -i "s|CORS_ORIGIN=https://localhost:5173|CORS_ORIGIN=https://$INSTANCE_IP|g" "$PROJECT_DIR/server/.env.production"
    
    print_success "Server CORS updated to allow HTTPS origins"
    
    # Show the changes
    echo ""
    print_status "Updated server CORS origin:"
    grep "CORS_ORIGIN" "$PROJECT_DIR/server/.env.production" || true
else
    print_warning "Server .env.production file not found"
fi

echo ""

# Fix development .env if it exists
if [ -f "$PROJECT_DIR/server/.env" ]; then
    print_status "Fixing development server CORS for HTTPS origins..."
    
    # Update CORS origin to use HTTPS
    sed -i "s|CORS_ORIGIN=http://|CORS_ORIGIN=https://|g" "$PROJECT_DIR/server/.env"
    sed -i "s|CORS_ORIGIN=http://$INSTANCE_IP|CORS_ORIGIN=https://$INSTANCE_IP|g" "$PROJECT_DIR/server/.env"
    sed -i "s|CORS_ORIGIN=https://localhost:5173|CORS_ORIGIN=https://$INSTANCE_IP|g" "$PROJECT_DIR/server/.env"
    
    print_success "Development server CORS updated to allow HTTPS origins"
    
    # Show the changes
    echo ""
    print_status "Updated development CORS origin:"
    grep "CORS_ORIGIN" "$PROJECT_DIR/server/.env" || true
fi

echo ""
print_success "Mixed Content issues fixed!"
echo ""
echo "📋 Next steps:"
echo "1. Rebuild the frontend: npm run build --prefix client"
echo "2. Restart the backend: pm2 restart bims-backend"
echo "3. Test the application at: https://$INSTANCE_IP"
echo ""
echo "🔍 To verify the fix:"
echo "1. Open browser developer tools (F12)"
echo "2. Check the Network tab for API calls"
echo "3. All API calls should now use HTTPS"
echo ""
echo "📁 Backup files created:"
ls -la "$PROJECT_DIR/client/.env.backup."* 2>/dev/null || echo "No backup files found"
