#!/bin/bash

# Enhanced Production Deployment Script for BIMS with Ngrok Domain
# This script builds and deploys the BIMS application for production using ngrok domain

set -e  # Exit on any error

echo "🚀 Starting BIMS Production Deployment with Ngrok Domain..."

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
BUILD_DIR="$PROJECT_DIR/build"
LOG_DIR="$PROJECT_DIR/logs"
DEPLOYMENT_LOG="$LOG_DIR/deployment-$(date +%Y%m%d_%H%M%S).log"
NGROK_DOMAIN="balkingly-niveous-maisie.ngrok-free.dev"

# Create necessary directories
mkdir -p "$LOG_DIR" "$PROJECT_DIR/config"

# Dynamic web directory detection
WEB_DIR="/var/www/html"
if [ ! -d "$WEB_DIR" ]; then
    WEB_DIR="/usr/share/nginx/html"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output with logging
print_status() {
    local message="[INFO] $1"
    echo -e "${BLUE}$message${NC}"
    log_message "$message"
}

print_success() {
    local message="[SUCCESS] $1"
    echo -e "${GREEN}$message${NC}"
    log_message "$message"
}

print_warning() {
    local message="[WARNING] $1"
    echo -e "${YELLOW}$message${NC}"
    log_message "$message"
}

print_error() {
    local message="[ERROR] $1"
    echo -e "${RED}$message${NC}"
    log_message "$message"
}

# Enhanced logging function with disk space check
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check available disk space (in MB)
    local available_space=$(df -m . | awk 'NR==2 {print $4}')
    
    # If less than 100MB available, skip logging to avoid disk full errors
    if [ "$available_space" -lt 100 ]; then
        echo -e "${YELLOW}[WARNING] Low disk space (${available_space}MB available). Skipping log write.${NC}" >&2
        return 0
    fi
    
    # Try to write to log file, but don't fail if disk is full
    echo "[$timestamp] $message" >> "$DEPLOYMENT_LOG" 2>/dev/null || {
        echo -e "${YELLOW}[WARNING] Failed to write to log file. Continuing without logging.${NC}" >&2
    }
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get the correct npm path
get_npm_path() {
    if command_exists npm; then
        which npm
    elif [ -f "/usr/bin/npm" ]; then
        echo "/usr/bin/npm"
    else
        echo "npm"
    fi
}

# Function to get the correct node path
get_node_path() {
    if command_exists node; then
        which node
    elif [ -f "/usr/bin/node" ]; then
        echo "/usr/bin/node"
    else
        echo "node"
    fi
}

# Check disk space
check_disk_space() {
    print_status "Checking disk space..."
    
    # Get available disk space in MB
    local available_space=$(df -m . | awk 'NR==2 {print $4}')
    local total_space=$(df -m . | awk 'NR==2 {print $2}')
    local used_percent=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    
    print_status "Available disk space: ${available_space}MB / ${total_space}MB (${used_percent}% used)"
    
    # Warn if disk usage is high
    if [ "$available_space" -lt 500 ]; then
        print_warning "Low disk space detected (${available_space}MB available)"
        print_warning "Attempting automatic cleanup..."
        cleanup_disk_space
        
        # Re-check disk space after cleanup
        available_space=$(df -m . | awk 'NR==2 {print $4}')
        print_status "Available disk space after cleanup: ${available_space}MB"
    fi
    
    # Critical warning if very low space
    if [ "$available_space" -lt 100 ]; then
        print_error "Critical: Very low disk space (${available_space}MB available)"
        print_error "Deployment may fail. Please free up space first."
        return 1
    fi
    
    print_success "Disk space check completed"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed"
        return 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed"
        return 1
    fi
    
    if ! command_exists pm2; then
        print_warning "PM2 is not installed. Installing PM2..."
        NPM_PATH=$(get_npm_path)
        "$NPM_PATH" install -g pm2 || {
            print_error "Failed to install PM2"
            return 1
        }
    fi
    
    if ! command_exists nginx; then
        print_warning "Nginx is not installed. Please install nginx for reverse proxy."
    fi
    
    print_success "Prerequisites check completed"
}

# Cleanup function to free up disk space
cleanup_disk_space() {
    print_status "Performing disk space cleanup..."
    
    # Clean up old backups (keep only the 5 most recent)
    if [ -d "backups" ]; then
        local backup_count=$(ls -1 backups/ 2>/dev/null | wc -l)
        if [ "$backup_count" -gt 5 ]; then
            print_status "Removing old backup directories..."
            ls -1t backups/ | tail -n +6 | xargs -I {} rm -rf backups/{} 2>/dev/null || true
            print_success "Removed $(($backup_count - 5)) old backup directories"
        fi
    fi
    
    # Clean up old log files (keep only the 10 most recent)
    if [ -d "logs" ]; then
        local log_count=$(ls -1 logs/ 2>/dev/null | wc -l)
        if [ "$log_count" -gt 10 ]; then
            print_status "Removing old log files..."
            ls -1t logs/ | tail -n +11 | xargs -I {} rm -f logs/{} 2>/dev/null || true
            print_success "Removed $(($log_count - 10)) old log files"
        fi
    fi
    
    # Clean npm cache if it's taking up significant space
    if command_exists npm; then
        local npm_cache_size=$(du -sm ~/.npm 2>/dev/null | cut -f1 || echo "0")
        if [ "$npm_cache_size" -gt 100 ]; then
            print_status "Cleaning npm cache (${npm_cache_size}MB)..."
            npm cache clean --force 2>/dev/null || true
            print_success "NPM cache cleaned"
        fi
    fi
    
    # Clean system package cache
    print_status "Cleaning system package cache..."
    sudo apt-get clean 2>/dev/null || true
    sudo apt-get autoremove -y 2>/dev/null || true
    
    print_success "Disk space cleanup completed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    NPM_PATH=$(get_npm_path)
    
    # Install client dependencies
    cd "$PROJECT_DIR/client"
    if [ -f "package-lock.json" ]; then
        # Try npm ci first, but fall back to npm install if lock file is out of sync
        if "$NPM_PATH" ci --production=false 2>/dev/null; then
            print_status "Client dependencies installed with npm ci"
        else
            print_warning "package-lock.json is out of sync, updating with npm install"
            "$NPM_PATH" install --production=false || {
                print_error "Failed to install client dependencies"
                return 1
            }
        fi
    else
        "$NPM_PATH" install --production=false || {
            print_error "Failed to install client dependencies"
            return 1
        }
    fi
    
    # Install server dependencies
    cd "$PROJECT_DIR/server"
    if [ -f "package-lock.json" ]; then
        # Try npm ci first, but fall back to npm install if lock file is out of sync
        if "$NPM_PATH" ci --omit=dev 2>/dev/null; then
            print_status "Server dependencies installed with npm ci"
        else
            print_warning "package-lock.json is out of sync, updating with npm install"
            "$NPM_PATH" install --omit=dev || {
                print_error "Failed to install server dependencies"
                return 1
            }
        fi
    else
        "$NPM_PATH" install --omit=dev || {
            print_error "Failed to install server dependencies"
            return 1
        }
    fi
    
    print_success "Dependencies installed"
}

# Build frontend to static files
build_frontend() {
    print_status "Building frontend to static files for production..."
    
    cd "$PROJECT_DIR/client"
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the application to static files
    NPM_PATH=$(get_npm_path)
    NODE_ENV=production "$NPM_PATH" run build || {
        print_error "Failed to build frontend"
        return 1
    }
    
    # Create build directory if it doesn't exist
    mkdir -p "$BUILD_DIR"
    
    # Copy built static files to build directory
    if [ -d "dist" ]; then
        cp -r dist/* "$BUILD_DIR/"
    elif [ -d "build" ]; then
        cp -r build/* "$BUILD_DIR/"
    else
        print_error "No build output directory found (dist or build)"
        return 1
    fi
    
    print_success "Frontend built to static files successfully"
}

# Setup backend for production
setup_backend() {
    print_status "Setting up backend for production..."
    
    cd "$PROJECT_DIR/server"
    
    # Copy production environment to .env for server compatibility
    if [ -f ".env.production" ]; then
        cp .env.production .env
    fi
    
    # Run database migrations (handle existing tables gracefully)
    print_status "Running database migrations..."
    NPM_PATH=$(get_npm_path)
    if NODE_ENV=production "$NPM_PATH" run db:migrate 2>&1 | grep -q "already exists"; then
        print_warning "Database tables already exist, skipping migration"
    elif NODE_ENV=production "$NPM_PATH" run db:migrate; then
        print_success "Database migrations completed"
    else
        print_warning "Database migration failed, but continuing..."
    fi
    
    # Seed database if needed
    if ! grep -q "DB_SEEDED=true" .env.production 2>/dev/null; then
        print_status "Seeding database..."
        if NODE_ENV=production "$NPM_PATH" run db:seed; then
            echo "DB_SEEDED=true" >> .env.production
            print_success "Database seeded successfully"
        else
            print_warning "Database seeding failed, but continuing..."
        fi
    else
        print_status "Database already seeded, skipping..."
    fi
    
    print_success "Backend setup completed"
}

# Enhanced PM2 setup
setup_pm2() {
    print_status "Setting up PM2 process manager..."
    
    cd "$PROJECT_DIR/server"
    
    # Get optimal PM2 instances
    local pm2_instances=$(get_optimal_pm2_instances)
    print_status "Using PM2 instances: $pm2_instances"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: 'bims-backend',
    script: 'server.js',
    instances: '$pm2_instances',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', '*.log'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 8000,
    autorestart: true,
    cron_restart: '0 2 * * *',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
    
    # Create logs directory
    mkdir -p logs
    chmod 755 logs
    
    print_success "PM2 configuration created"
}

# Get optimal PM2 instances
get_optimal_pm2_instances() {
    local cpu_cores=$(nproc)
    if [ "$cpu_cores" -ge 4 ]; then
        echo "max"
    else
        echo "$cpu_cores"
    fi
}

# Start application with PM2
start_application() {
    print_status "Starting application with PM2..."
    
    cd "$PROJECT_DIR/server"
    
    # Stop existing PM2 process if running
    if pm2 list | grep -q "bims-backend"; then
        print_status "Stopping existing PM2 process..."
        pm2 stop "bims-backend" || true
        pm2 delete "bims-backend" || true
    fi
    
    # Start with ecosystem config
    if pm2 start ecosystem.config.cjs --env production; then
        print_success "Application started with PM2"
    else
        print_warning "Failed to start with ecosystem config, trying direct start..."
        if pm2 start server.js --name "bims-backend" --instances max --exec-mode cluster; then
            print_success "Application started with PM2 direct start"
        else
            print_error "Failed to start application with PM2"
            return 1
        fi
    fi
    
    # Wait for the application to start
    print_status "Waiting for application to initialize..."
    sleep 5
    
    # Check application status
    if pm2 list | grep -q "bims-backend.*online"; then
        print_success "Application is running successfully with PM2"
    else
        print_warning "Application may not be fully online yet"
        pm2 status
    fi
    
    # Save PM2 configuration
    pm2 save || print_warning "Failed to save PM2 configuration"
    
    print_success "PM2 setup completed"
}

# Configure Nginx for ngrok domain
setup_nginx() {
    if ! command_exists nginx; then
        print_warning "Nginx not installed. Skipping Nginx configuration."
        return 0
    fi
    
    print_status "Setting up Nginx configuration for ngrok domain: $NGROK_DOMAIN"
    
    # Copy frontend build to web directory
    print_status "Copying frontend files to web directory: $WEB_DIR"
    if ! sudo mkdir -p "$WEB_DIR"; then
        print_error "Failed to create web directory"
        return 1
    fi
    
    if sudo cp -r "$BUILD_DIR"/* "$WEB_DIR/" 2>/dev/null; then
        sudo chown -R www-data:www-data "$WEB_DIR" 2>/dev/null || true
        print_success "Frontend files copied successfully"
    else
        print_error "Failed to copy frontend files to $WEB_DIR"
        return 1
    fi
    
    # Create Nginx configuration for ngrok domain
    print_status "Creating Nginx configuration for ngrok domain..."
    
    sudo tee /etc/nginx/sites-available/bims > /dev/null <<EOF
# HTTP server (redirect to HTTPS)
server {
    listen 80;
    server_name $NGROK_DOMAIN localhost;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name $NGROK_DOMAIN localhost;
    
    # SSL configuration
    ssl_certificate /etc/ssl/bims/bims-cert.pem;
    ssl_certificate_key /etc/ssl/bims/bims-key.pem;
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
        root $WEB_DIR;
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
    
    # Enable the site and remove default
    print_status "Enabling Nginx site..."
    sudo ln -sf /etc/nginx/sites-available/bims /etc/nginx/sites-enabled/ || {
        print_error "Failed to enable Nginx site"
        return 1
    }
    sudo rm -f /etc/nginx/sites-enabled/default || true
    
    # Test and reload Nginx configuration
    print_status "Testing Nginx configuration..."
    if sudo nginx -t; then
        print_success "Nginx configuration test passed"
        if sudo systemctl reload nginx; then
            print_success "Nginx reloaded successfully"
        else
            print_warning "Nginx reload failed, trying restart..."
            sudo systemctl restart nginx || {
                print_error "Failed to restart Nginx"
                return 1
            }
        fi
    else
        print_error "Nginx configuration test failed"
        sudo nginx -t
        return 1
    fi
    
    print_success "Nginx setup completed successfully"
}

# Enhanced security and deployment fixes
fix_deployment_issues() {
    print_status "Checking and fixing common deployment issues..."
    
    # Ensure required directories exist
    print_status "Creating required directories..."
    sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/html /var/log/nginx 2>/dev/null || true
    sudo mkdir -p /etc/nginx/conf.d 2>/dev/null || true
    
    # SSL certificate setup
    print_status "Setting up SSL certificates for HTTPS..."
    local ssl_dir="/etc/ssl/bims"
    local ssl_cert="$ssl_dir/bims-cert.pem"
    local ssl_key="$ssl_dir/bims-key.pem"
    
    if [[ ! -f "$ssl_cert" ]] || [[ ! -f "$ssl_key" ]]; then
        print_status "Creating SSL certificate..."
        sudo mkdir -p "$ssl_dir"
        
        # Create SSL certificate for ngrok domain
        print_status "Creating SSL certificate for: $NGROK_DOMAIN"
        
        # Create SSL certificate
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
            -keyout "$ssl_key" \
            -out "$ssl_cert" \
            -subj "/C=PH/ST=Eastern Samar/L=Borongan/O=BIMS/CN=$NGROK_DOMAIN" \
            -addext "subjectAltName=DNS:$NGROK_DOMAIN,DNS:localhost,IP:127.0.0.1" 2>/dev/null && {
            print_success "SSL certificate created successfully"
            
            # Set proper permissions
            sudo chmod 600 "$ssl_key"
            sudo chmod 644 "$ssl_cert"
            sudo chown root:root "$ssl_key" "$ssl_cert"
        } || {
            print_warning "Failed to create SSL certificate, HTTPS will not work"
        }
    else
        print_status "SSL certificates already exist"
    fi
    
    # Fix Nginx user and permissions
    if command_exists nginx; then
        print_status "Setting up Nginx user and permissions..."
        
        # Ensure www-data user exists
        if ! id "www-data" &>/dev/null; then
            print_status "Creating www-data user..."
            sudo useradd -r -s /bin/false www-data 2>/dev/null || true
        fi
        
        # Set proper ownership
        sudo chown -R www-data:www-data /var/www/html 2>/dev/null || true
        sudo chown -R www-data:adm /var/log/nginx 2>/dev/null || true
        
        # Ensure nginx can start
        if ! sudo systemctl is-enabled nginx &>/dev/null; then
            print_status "Enabling Nginx service..."
            sudo systemctl enable nginx 2>/dev/null || true
        fi
        
        if ! sudo systemctl is-active --quiet nginx; then
            print_status "Starting Nginx service..."
            sudo systemctl start nginx 2>/dev/null || true
        fi
    fi
    
    print_success "Deployment issues check completed"
}

# Create deployment info
create_deployment_info() {
    print_status "Creating deployment information..."
    
    cat > "$BUILD_DIR/DEPLOYMENT_INFO.md" <<EOF
# BIMS Production Deployment with Ngrok Domain

**Deployment Date:** $(date)
**Ngrok Domain:** $NGROK_DOMAIN
**Version:** $(git rev-parse --short HEAD 2>/dev/null || echo "Unknown")
**Node Version:** $(node --version 2>/dev/null || echo "Unknown")
**NPM Version:** $(npm --version 2>/dev/null || echo "Unknown")

## Application Status
- Frontend: Built and deployed to $BUILD_DIR
- Backend: Running with PM2 as 'bims-backend' in cluster mode
- Database: PostgreSQL
- Domain: $NGROK_DOMAIN

## Application URLs
- **Frontend:** https://$NGROK_DOMAIN
- **Backend API:** https://$NGROK_DOMAIN/api
- **Uploads:** https://$NGROK_DOMAIN/uploads

## Useful Commands

### PM2 Management
\`\`\`bash
# View application status
pm2 status

# View logs
pm2 logs bims-backend

# Restart application
pm2 restart bims-backend

# Stop application
pm2 stop bims-backend

# Delete application
pm2 delete bims-backend
\`\`\`

### Nginx Management
\`\`\`bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx
\`\`\`

## Troubleshooting

### If application is not accessible:
1. Check PM2 status: \`pm2 status\`
2. Check PM2 logs: \`pm2 logs bims-backend\`
3. Test Nginx config: \`sudo nginx -t\`
4. Check Nginx status: \`sudo systemctl status nginx\`

### Camera not working:
1. Ensure using HTTPS: https://$NGROK_DOMAIN
2. Check browser console (F12) for camera errors
3. Verify camera permissions in browser settings
4. Test camera in other applications

### Ngrok Domain Issues:
1. Ensure ngrok tunnel is running and accessible
2. Check if domain is properly configured in environment files
3. Verify CORS settings allow the ngrok domain
EOF
    
    print_success "Deployment information created"
}

# Health check function
health_check() {
    print_status "Performing health check..."
    
    local health_errors=0
    
    # Check PM2 status
    if pm2 list | grep -q "bims-backend.*online"; then
        print_success "PM2 application is online"
    else
        print_error "PM2 application is not online"
        ((health_errors++))
    fi
    
    # Check Nginx status
    if sudo systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
        ((health_errors++))
    fi
    
    # Check if backend is responding
    local backend_url="http://localhost:5000/welcome"
    if curl -s --max-time 10 "$backend_url" >/dev/null; then
        print_success "Backend is responding"
    else
        print_error "Backend is not responding"
        ((health_errors++))
    fi
    
    # Check if frontend is accessible
    local frontend_url="http://localhost"
    if curl -s --max-time 10 "$frontend_url" >/dev/null; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not accessible"
        ((health_errors++))
    fi
    
    if [ $health_errors -eq 0 ]; then
        print_success "Health check passed - all services are running"
    else
        print_warning "Health check failed - $health_errors issues found"
    fi
    
    return $health_errors
}

# Main deployment function
main() {
    echo "🏛️ BIMS Production Deployment with Ngrok Domain"
    echo "================================================"
    echo "🌐 Ngrok Domain: $NGROK_DOMAIN"
    echo ""
    
    local deployment_start_time=$(date +%s)
    local deployment_errors=0
    
    # Run each step with error handling
    print_status "Starting deployment process..."
    
    # Phase 1: Pre-deployment checks
    print_status "Phase 1: Pre-deployment checks"
    check_disk_space || ((deployment_errors++))
    check_prerequisites || ((deployment_errors++))
    
    # Phase 2: System preparation
    print_status "Phase 2: System preparation"
    fix_deployment_issues || ((deployment_errors++))
    
    # Phase 3: Application deployment
    print_status "Phase 3: Application deployment"
    install_dependencies || ((deployment_errors++))
    build_frontend || ((deployment_errors++))
    setup_backend || ((deployment_errors++))
    setup_pm2 || ((deployment_errors++))
    start_application || ((deployment_errors++))
    
    # Phase 4: Infrastructure setup
    print_status "Phase 4: Infrastructure setup"
    setup_nginx || ((deployment_errors++))
    
    # Phase 5: Post-deployment verification
    print_status "Phase 5: Post-deployment verification"
    create_deployment_info || ((deployment_errors++))
    health_check || ((deployment_errors++))
    
    # Calculate deployment duration
    local deployment_end_time=$(date +%s)
    local deployment_duration=$((deployment_end_time - deployment_start_time))
    
    echo ""
    if [ $deployment_errors -eq 0 ]; then
        echo "🎉 Deployment completed successfully!"
        echo "⏱️  Total deployment time: ${deployment_duration} seconds"
    else
        echo "⚠️ Deployment completed with $deployment_errors warnings/errors"
        echo "Check the logs above for details. Your application may still be functional."
        echo "📄 Detailed logs available at: $DEPLOYMENT_LOG"
    fi
    
    echo ""
    echo "🔗 Application URLs:"
    echo "🌐 Frontend: https://$NGROK_DOMAIN"
    echo "🔧 Backend API: https://$NGROK_DOMAIN/api"
    echo "📁 Uploads: https://$NGROK_DOMAIN/uploads"
    echo ""
    echo "📱 Camera Functionality:"
    echo "• Camera access requires HTTPS - use https://$NGROK_DOMAIN"
    echo "• Accept the self-signed certificate warning in your browser"
    echo "• Grant camera permissions when prompted"
    echo ""
    echo "📊 PM2 Status:"
    pm2 status 2>/dev/null || echo "PM2 status unavailable"
    echo ""
    echo "📄 Nginx Status:"
    sudo systemctl status nginx --no-pager -l 2>/dev/null || echo "Nginx status unavailable"
    
    return $deployment_errors
}

# Run main function
main "$@"
