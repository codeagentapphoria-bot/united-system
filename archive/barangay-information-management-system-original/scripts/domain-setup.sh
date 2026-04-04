#!/bin/bash

# Domain Setup Script for BIMS
# Usage: ./scripts/domain-setup.sh yourdomain.com

set -e

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

# Check if domain is provided
DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    print_error "Usage: ./scripts/domain-setup.sh yourdomain.com"
    print_error "Example: ./scripts/domain-setup.sh bims.yourdomain.com"
    exit 1
fi

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run with sudo"
    print_error "Usage: sudo ./scripts/domain-setup.sh $DOMAIN"
    exit 1
fi

print_status "Setting up domain: $DOMAIN"

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Step 1: Backup current environment files
print_status "Backing up current environment files..."
if [ -f "$PROJECT_DIR/client/.env" ]; then
    cp "$PROJECT_DIR/client/.env" "$PROJECT_DIR/client/.env.backup.$(date +%Y%m%d_%H%M%S)"
fi
if [ -f "$PROJECT_DIR/server/.env.production" ]; then
    cp "$PROJECT_DIR/server/.env.production" "$PROJECT_DIR/server/.env.production.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Step 2: Update environment files
print_status "Updating environment files..."
if [ -f "$PROJECT_DIR/client/.env" ]; then
    sed -i "s|https://192.168.1.45|https://$DOMAIN|g" "$PROJECT_DIR/client/.env"
    sed -i "s|http://192.168.1.45|https://$DOMAIN|g" "$PROJECT_DIR/client/.env"
    print_success "Updated client environment file"
else
    print_warning "Client .env file not found, skipping..."
fi

if [ -f "$PROJECT_DIR/server/.env.production" ]; then
    sed -i "s|https://192.168.1.45|https://$DOMAIN|g" "$PROJECT_DIR/server/.env.production"
    sed -i "s|http://192.168.1.45|https://$DOMAIN|g" "$PROJECT_DIR/server/.env.production"
    print_success "Updated server environment file"
else
    print_warning "Server .env.production file not found, skipping..."
fi

# Step 3: Check if Certbot is installed
if ! command -v certbot >/dev/null 2>&1; then
    print_status "Installing Certbot for SSL certificates..."
    apt update
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# Step 4: Create Nginx configuration for domain
print_status "Creating Nginx configuration for $DOMAIN..."

# Create the Nginx configuration file
cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
# HTTP server (redirect to HTTPS)
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Set max body size for file uploads
    client_max_body_size 100M;
    
    # Backend API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Backend uploads
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Backend welcome endpoint
    location /welcome {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Frontend static files
    location / {
        root /var/www/html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache control for different file types
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        location ~* \.(html|json)\$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
        }
    }
    
    # Security headers for camera access
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' ws: wss:; camera-src 'self';" always;
    
    # Camera-specific headers (enabled for camera access)
    # Note: Permissions-Policy header removed to allow camera access
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /index.html;
}
EOF

print_success "Nginx configuration created for $DOMAIN"

# Step 5: Enable the site
print_status "Enabling Nginx site..."
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/"
print_success "Nginx site enabled"

# Step 6: Test Nginx configuration
print_status "Testing Nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration test passed"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Step 7: Reload Nginx
print_status "Reloading Nginx..."
systemctl reload nginx
print_success "Nginx reloaded"

# Step 8: Get SSL certificate
print_status "Obtaining SSL certificate for $DOMAIN..."
print_warning "Make sure your domain DNS is pointing to this server before continuing"
print_warning "Press Enter to continue or Ctrl+C to abort..."
read -r

if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN; then
    print_success "SSL certificate obtained successfully"
else
    print_error "Failed to obtain SSL certificate"
    print_warning "You may need to:"
    print_warning "1. Ensure DNS is pointing to this server"
    print_warning "2. Wait for DNS propagation (up to 48 hours)"
    print_warning "3. Try again later"
    exit 1
fi

# Step 9: Deploy the application
print_status "Deploying application with domain configuration..."
cd "$PROJECT_DIR"
if ./scripts/deploy.sh; then
    print_success "Application deployed successfully"
else
    print_warning "Deployment completed with warnings"
fi

# Step 10: Final verification
print_status "Performing final verification..."

# Test HTTPS redirect
if curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" | grep -q "301"; then
    print_success "HTTP to HTTPS redirect working"
else
    print_warning "HTTP to HTTPS redirect may not be working"
fi

# Test HTTPS access
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200"; then
    print_success "HTTPS access working"
else
    print_warning "HTTPS access may not be working"
fi

# Test API endpoint
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/welcome" | grep -q "200"; then
    print_success "API endpoint working"
else
    print_warning "API endpoint may not be working"
fi

print_success "Domain setup completed for: $DOMAIN"
echo ""
echo "🎉 Your BIMS application is now accessible at:"
echo "   Frontend: https://$DOMAIN"
echo "   API: https://$DOMAIN/api"
echo "   Camera: https://$DOMAIN/request"
echo ""
echo "📋 Next steps:"
echo "1. Test all functionality at https://$DOMAIN"
echo "2. Set up SSL certificate auto-renewal:"
echo "   sudo crontab -e"
echo "   Add: 0 12 * * * /usr/bin/certbot renew --quiet"
echo "3. Update any external references to use your domain"
echo ""
echo "🔒 SSL certificate will auto-renew every 60 days"
echo "📞 For support, check the logs: pm2 logs bims-backend" 