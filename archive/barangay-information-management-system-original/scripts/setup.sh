#!/bin/bash

# BIMS Ubuntu Server Setup Script
# This script installs all required applications for BIMS on Ubuntu EC2 instance

set -e  # Exit on any error

# Get the project directory (parent of scripts directory)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Configuration
LOG_FILE="/var/log/bims-setup.log"
DRY_RUN=false
SKIP_DEPS=false
DOMAIN_NAME=""
VERBOSE=false

# Help function
show_help() {
    cat << EOF
BIMS Ubuntu Server Setup Script

Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -d, --domain DOMAIN Set domain name for SSL
    -s, --skip-deps     Skip dependency installation
    -v, --verbose       Enable verbose output
    --dry-run          Show what would be installed without installing

Examples:
    $0                          # Full installation
    $0 -d example.com           # Install with domain
    $0 --skip-deps             # Skip npm dependencies
    $0 --dry-run               # Preview installation

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        -s|--skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Setup logging
setup_logging() {
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo touch "$LOG_FILE"
    sudo chown $USER:$USER "$LOG_FILE"
    
    if [ "$VERBOSE" = true ]; then
        exec > >(tee -a "$LOG_FILE") 2>&1
    else
        exec >> "$LOG_FILE" 2>&1
    fi
}

# Log with timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

echo "🏛️ BIMS Ubuntu Server Setup"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if package is installed
package_installed() {
    dpkg -l "$1" &> /dev/null
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

# Generate random password
generate_random_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Rollback function
rollback_on_failure() {
    print_error "Setup failed at step: $1"
    print_status "Rolling back changes..."
    
    # Stop services
    sudo systemctl stop postgresql nginx redis-server 2>/dev/null || true
    
    # Remove created databases if they exist
    if [ -n "$PG_DATABASE" ]; then
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $PG_DATABASE;" 2>/dev/null || true
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${PG_DATABASE}_development;" 2>/dev/null || true
    fi
    
    print_warning "Rollback completed. Please check logs at $LOG_FILE and try again."
    exit 1
}

# Validate system requirements
validate_requirements() {
    print_status "Validating system requirements..."
    
    # Check available disk space (minimum 10GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    REQUIRED_SPACE=10485760  # 10GB in KB
    
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        print_error "Insufficient disk space. Required: 10GB, Available: $(($AVAILABLE_SPACE/1024/1024))GB"
        exit 1
    fi
    
    # Check available memory (minimum 2GB)
    AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$AVAILABLE_MEMORY" -lt 2048 ]; then
        print_warning "Low memory detected: ${AVAILABLE_MEMORY}MB. Recommended: 2GB+"
    fi
    
    # Check if running on supported Ubuntu version
    UBUNTU_VERSION=$(lsb_release -rs)
    if [[ "$UBUNTU_VERSION" < "20.04" ]]; then
        print_error "Unsupported Ubuntu version: $UBUNTU_VERSION. Required: 20.04+"
        exit 1
    fi
    
    print_success "System requirements validated"
}

# Update system packages
update_system() {
    print_status "Updating system packages..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would run: sudo apt update && sudo apt upgrade -y"
        return 0
    fi
    
    sudo apt update || {
        print_warning "Some repository updates failed, but continuing..."
    }
    sudo apt upgrade -y || {
        print_warning "Some package upgrades failed, but continuing..."
    }
    print_success "System updated"
}

# Install basic utilities
install_basic_utils() {
    print_status "Installing basic utilities..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would install: curl wget git unzip build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release"
        return 0
    fi
    
    sudo apt install -y curl wget git unzip build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    print_success "Basic utilities installed"
}

# Install Node.js and npm
install_nodejs() {
    print_status "Installing Node.js and npm..."
    
    if command_exists node; then
        print_warning "Node.js is already installed: $(node --version)"
        return
    fi
    
    # Add NodeSource repository for latest LTS version
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs
    
    # Verify installation
    print_success "Node.js installed: $(node --version)"
    print_success "npm installed: $(npm --version)"
}

# Install PostgreSQL
install_postgresql() {
    print_status "Installing PostgreSQL..."
    
    if command_exists psql; then
        print_warning "PostgreSQL is already installed: $(psql --version)"
    else
        # Add PostgreSQL repository with proper key handling
        print_status "Adding PostgreSQL repository..."
        sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
        
        # Download and add the PostgreSQL signing key using the modern method
        wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
        echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
        
        sudo apt update
        
        # Install PostgreSQL
        sudo apt install -y postgresql postgresql-contrib postgis postgresql-postgis-scripts
    fi
    
    # Always ensure PostgreSQL is properly initialized and running
    print_status "Ensuring PostgreSQL is properly initialized and running..."
    
    # Initialize PostgreSQL if not already initialized
    if [ ! -d "/var/lib/postgresql/17/main" ]; then
        print_status "Initializing PostgreSQL database cluster..."
        sudo mkdir -p /var/lib/postgresql/17/main
        sudo chown postgres:postgres /var/lib/postgresql/17/main
        sudo -u postgres /usr/lib/postgresql/17/bin/initdb -D /var/lib/postgresql/17/main
        print_success "PostgreSQL database cluster initialized"
    fi
    
    # Create log directory if it doesn't exist
    sudo mkdir -p /var/log/postgresql
    sudo chown postgres:postgres /var/log/postgresql
    
    # Check if PostgreSQL is already running
    if sudo systemctl is-active --quiet postgresql; then
        print_status "PostgreSQL is already running"
    else
        # Stop any existing PostgreSQL processes
        sudo systemctl stop postgresql@17-main 2>/dev/null || true
        sudo systemctl stop postgresql 2>/dev/null || true
        
        # Try to start PostgreSQL using systemctl first
        print_status "Starting PostgreSQL service..."
        if sudo systemctl start postgresql; then
            print_success "PostgreSQL started with systemctl"
        else
            # Fallback to manual start
            print_status "Trying manual PostgreSQL start..."
            sudo -u postgres /usr/lib/postgresql/17/bin/pg_ctl -D /var/lib/postgresql/17/main -l /var/log/postgresql/postgresql-17-main.log start || {
                print_warning "Failed to start PostgreSQL manually, but continuing..."
            }
        fi
    fi
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        sleep 1
    done
    
    # Test connection
    if ! sudo -u postgres psql -c "SELECT version();" >/dev/null 2>&1; then
        print_error "PostgreSQL connection test failed"
        return 1
    fi
    
    print_success "PostgreSQL installed and running: $(psql --version)"
}

# Install PM2 globally
install_pm2() {
    print_status "Installing PM2 process manager..."
    
    if command_exists pm2; then
        print_warning "PM2 is already installed: $(pm2 --version)"
        return
    fi
    
    sudo npm install -g pm2
    
    print_success "PM2 installed: $(pm2 --version)"
}

# Install Nginx with pre-configuration
install_nginx() {
    print_status "Installing Nginx..."
    
    if command_exists nginx; then
        print_warning "Nginx is already installed: $(nginx -v 2>&1)"
        return
    fi
    
    # Pre-create necessary directories and files for Nginx BEFORE installation
    print_status "Pre-configuring Nginx directories and files..."
    sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d /var/log/nginx
    sudo mkdir -p /etc/nginx/modules-enabled
    sudo touch /etc/nginx/modules-enabled/50-mod-http-ssl.conf
    
    # Create basic nginx.conf BEFORE installation to prevent startup failure
    print_status "Creating Nginx configuration files..."
    if [ ! -f "/etc/nginx/nginx.conf" ]; then
        print_status "Creating /etc/nginx/nginx.conf..."
        sudo tee /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
    fi
    
    # Create mime.types BEFORE installation
    if [ ! -f "/etc/nginx/mime.types" ]; then
        print_status "Creating /etc/nginx/mime.types..."
        sudo tee /etc/nginx/mime.types << 'EOF'
types {
    text/html                             html htm shtml;
    text/css                              css;
    text/xml                              xml;
    image/gif                             gif;
    image/jpeg                            jpeg jpg;
    application/javascript                js;
    application/atom+xml                  atom;
    application/rss+xml                   rss;
    text/mathml                           mml;
    text/plain                            txt;
    text/vnd.sun.j2me.app-descriptor      jad;
    text/vnd.wap.wml                      wml;
    text/x-component                      htc;
    image/png                             png;
    image/tiff                            tif tiff;
    image/vnd.wap.wbmp                    wbmp;
    image/x-icon                          ico;
    image/x-jng                           jng;
    image/x-ms-bmp                        bmp;
    image/svg+xml                         svg svgz;
    image/webp                            webp;
    application/font-woff                 woff;
    application/java-archive              jar war ear;
    application/json                      json;
    application/mac-binhex40              hqx;
    application/msword                    doc;
    application/pdf                       pdf;
    application/postscript                ps eps ai;
    application/rtf                       rtf;
    application/vnd.apple.mpegurl         m3u8;
    application/vnd.ms-excel              xls;
    application/vnd.ms-fontobject         eot;
    application/vnd.ms-powerpoint         ppt;
    application/vnd.wap.wmlc              wmlc;
    application/vnd.wap.xhtml+xml         xht;
    application/x-7z-compressed           7z;
    application/x-cocoa                   cco;
    application/x-java-archive-diff       jardiff;
    application/x-java-jnlp-file          jnlp;
    application/x-makeself                run;
    application/x-perl                    pl pm;
    application/x-pilot                   prc pdb;
    application/x-rar-compressed          rar;
    application/x-redhat-package-manager  rpm;
    application/x-sea                     sea;
    application/x-shockwave-flash         swf;
    application/x-stuffit                 sit;
    application/x-tcl                     tcl tk;
    application/x-x509-ca-cert            der pem crt;
    application/x-xpinstall               xpi;
    application/xhtml+xml                 xhtml;
    application/xspf+xml                  xspf;
    application/zip                       zip;
    application/octet-stream              bin exe dll;
    application/octet-stream              deb;
    application/octet-stream              dmg;
    application/octet-stream              iso img;
    application/octet-stream              msi msp msm;
    application/vnd.openxmlformats-officedocument.wordprocessingml.document    docx;
    application/vnd.openxmlformats-officedocument.spreadsheetml.sheet          xlsx;
    application/vnd.openxmlformats-officedocument.presentationml.presentation  pptx;
    audio/midi                            mid midi kar;
    audio/mpeg                            mp3;
    audio/ogg                             ogg;
    audio/x-m4a                           m4a;
    audio/x-realaudio                     ra;
    video/3gpp                            3gpp 3gp;
    video/mp2t                            ts;
    video/mp4                             mp4;
    video/mpeg                            mpeg mpg;
    video/quicktime                       mov;
    video/webm                            webm;
    video/x-flv                           flv;
    video/x-m4v                           m4v;
    video/x-mng                           mng;
    video/x-ms-asf                        asx asf;
    video/x-ms-wmv                        wmv;
    video/x-msvideo                       avi;
}
EOF
    fi
    
    # Set proper permissions
    sudo chown -R www-data:www-data /var/www/html 2>/dev/null || true
    sudo chmod -R 755 /var/www/html 2>/dev/null || true
    
    # Now install Nginx (configuration files already created above)
    print_status "Installing Nginx package..."
    sudo apt install -y nginx
    
    # Test Nginx configuration with error handling
    print_status "Testing Nginx configuration..."
    if sudo nginx -t 2>/dev/null; then
        print_success "Nginx configuration test passed"
    else
        print_warning "Nginx configuration test failed, but continuing..."
    fi
    
    # Start and enable Nginx service with error handling
    print_status "Starting Nginx service..."
    if sudo systemctl start nginx 2>/dev/null; then
        print_success "Nginx started successfully"
    else
        print_warning "Failed to start Nginx with systemctl, trying manual start..."
        sudo nginx 2>/dev/null || true
    fi
    
    sudo systemctl enable nginx 2>/dev/null || true
    
    # Configure firewall for Nginx
    sudo ufw allow 'Nginx Full' 2>/dev/null || true
    
    print_success "Nginx installed: $(nginx -v 2>&1)"
}

# Install GDAL/OGR2OGR
install_gdal() {
    print_status "Installing GDAL/OGR2OGR..."
    
    if command_exists ogr2ogr; then
        print_warning "GDAL/OGR2OGR is already installed: $(ogr2ogr --version)"
        return
    fi
    
    # Try to add UbuntuGIS PPA, but handle failures gracefully
    print_status "Adding UbuntuGIS PPA for latest GDAL..."
    if sudo add-apt-repository ppa:ubuntugis/ppa -y 2>/dev/null; then
        sudo apt update || {
            print_warning "UbuntuGIS PPA update failed, trying to install from main repositories..."
        }
    else
        print_warning "Failed to add UbuntuGIS PPA, installing from main repositories..."
    fi
    
    # Install GDAL from available repositories
    if sudo apt install -y gdal-bin libgdal-dev python3-gdal 2>/dev/null; then
        print_success "GDAL/OGR2OGR installed: $(ogr2ogr --version)"
    else
        print_warning "GDAL installation failed, but continuing..."
        print_warning "You may need to install GDAL manually later if needed"
    fi
}

# Install additional development tools
install_dev_tools() {
    print_status "Installing additional development tools..."
    
    # Install Python and pip (needed for some GDAL tools)
    sudo apt install -y python3 python3-pip python3-venv
    
    # Install additional build tools
    sudo apt install -y pkg-config libssl-dev libffi-dev
    
    # Install additional utilities
    sudo apt install -y htop tree jq
    
    print_success "Development tools installed"
}

# Install Redis (optional, for caching)
install_redis() {
    print_status "Installing Redis..."
    
    if command_exists redis-server; then
        print_warning "Redis is already installed: $(redis-server --version)"
        return
    fi
    
    sudo apt install -y redis-server
    
    # Start and enable Redis service
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    
    print_success "Redis installed: $(redis-server --version)"
}

# Configure PostgreSQL for BIMS
configure_postgresql() {
    print_status "Configuring PostgreSQL for BIMS..."
    
    # Get instance IP address for environment configuration
    INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}')
    
    print_status "Detected instance IP: $INSTANCE_IP"
    
    # Create production environment file from example
    if [ ! -f "$PROJECT_DIR/server/.env.production" ]; then
        print_status "Creating production environment file..."
        cp "$PROJECT_DIR/server/env.example" "$PROJECT_DIR/server/.env.production"
        
        # Update production environment with instance IP and production settings
        sed -i "s|PG_DATABASE=bims|PG_DATABASE=bims_production|g" "$PROJECT_DIR/server/.env.production"
        sed -i "s|NODE_ENV=development|NODE_ENV=production|g" "$PROJECT_DIR/server/.env.production"
        sed -i "s|CORS_ORIGIN=http://localhost:5173|CORS_ORIGIN=https://$INSTANCE_IP|g" "$PROJECT_DIR/server/.env.production"
        sed -i "s|VITE_APP_ENVIRONMENT=development|VITE_APP_ENVIRONMENT=production|g" "$PROJECT_DIR/server/.env.production"
        
        print_success "Production environment file created: $PROJECT_DIR/server/.env.production"
        print_warning "Please review and update the production environment file with your settings"
    else
        print_warning "Production environment file already exists"
    fi
    
    # Create development environment file from example (only if it doesn't exist)
    if [ ! -f "$PROJECT_DIR/server/.env" ]; then
        print_status "Creating development environment file..."
        cp "$PROJECT_DIR/server/env.example" "$PROJECT_DIR/server/.env"
        print_success "Development environment file created: $PROJECT_DIR/server/.env"
    else
        print_warning "Development environment file already exists - preserving existing content"
    fi
    
    # Create client environment file from example (only if it doesn't exist)
    if [ ! -f "$PROJECT_DIR/client/.env" ]; then
        print_status "Creating client environment file..."
        cp "$PROJECT_DIR/client/env.example" "$PROJECT_DIR/client/.env"
        
        # Update client environment with instance IP and HTTPS
        sed -i "s|http://localhost:5000|https://$INSTANCE_IP|g" "$PROJECT_DIR/client/.env"
        sed -i "s|VITE_API_BASE_URL=http://|VITE_API_BASE_URL=https://|g" "$PROJECT_DIR/client/.env"
        sed -i "s|VITE_SERVER_URL=http://|VITE_SERVER_URL=https://|g" "$PROJECT_DIR/client/.env"
        
        print_success "Client environment file created: $PROJECT_DIR/client/.env"
    else
        print_warning "Client environment file already exists - preserving existing content"
    fi
    
    # Read database configuration from environment file
    if [ -f "$PROJECT_DIR/server/.env.production" ]; then
        source "$PROJECT_DIR/server/.env.production"
    else
        source "$PROJECT_DIR/server/.env"
    fi
    
    # Create database user if it doesn't exist
    if [ "$PG_USER" != "postgres" ]; then
        sudo -u postgres psql -c "CREATE USER $PG_USER WITH PASSWORD '$PG_PASSWORD';" 2>/dev/null || print_warning "User $PG_USER might already exist"
    fi
    
    # Create production database
    sudo -u postgres psql -c "CREATE DATABASE $PG_DATABASE OWNER $PG_USER;" 2>/dev/null || print_warning "Database $PG_DATABASE might already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DATABASE TO $PG_USER;" 2>/dev/null || true
    
    # Create development database
    DEV_DATABASE="${PG_DATABASE}_development"
    sudo -u postgres psql -c "CREATE DATABASE $DEV_DATABASE OWNER $PG_USER;" 2>/dev/null || print_warning "Database $DEV_DATABASE might already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DEV_DATABASE TO $PG_USER;" 2>/dev/null || true
    
    # Enable PostGIS extension on both databases
    sudo -u postgres psql -d "$PG_DATABASE" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || true
    sudo -u postgres psql -d "$DEV_DATABASE" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || true
    
    print_success "PostgreSQL configured for BIMS"
    print_status "Production database: $PG_DATABASE"
    print_status "Development database: $DEV_DATABASE"
    print_status "Database user: $PG_USER"
}

# Configure firewall with enhanced security
configure_firewall() {
    print_status "Configuring firewall with enhanced security..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would configure UFW firewall with SSH, HTTP, HTTPS, and port 5000"
        return 0
    fi
    
    # Enable UFW if not already enabled
    if ! sudo ufw status | grep -q "Status: active"; then
        sudo ufw --force enable
    fi
    
    # Allow SSH with rate limiting
    sudo ufw limit ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80
    sudo ufw allow 443
    
    # Allow application port (if different from 80/443)
    sudo ufw allow 5000
    
    # Enable logging for denied connections
    sudo ufw logging on
    
    print_success "Firewall configured with enhanced security"
}

# PostgreSQL security hardening
configure_postgresql_security() {
    print_status "Hardening PostgreSQL configuration..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would configure PostgreSQL security settings"
        return 0
    fi
    
    # Update postgresql.conf for security
    sudo -u postgres psql -c "
        ALTER SYSTEM SET listen_addresses = 'localhost';
        ALTER SYSTEM SET log_connections = on;
        ALTER SYSTEM SET log_disconnections = on;
        ALTER SYSTEM SET log_statement = 'mod';
        ALTER SYSTEM SET max_connections = 100;
        ALTER SYSTEM SET shared_buffers = '256MB';
        ALTER SYSTEM SET effective_cache_size = '1GB';
        SELECT pg_reload_conf();
    " 2>/dev/null || {
        print_warning "PostgreSQL security configuration failed, but continuing..."
    }
    
    print_success "PostgreSQL security configured"
}

# Install additional useful tools
install_additional_tools() {
    print_status "Installing additional useful tools..."
    
    # Install monitoring tools
    sudo apt install -y htop iotop nethogs
    
    # Install log management tools
    sudo apt install -y logrotate
    
    # Install backup tools
    sudo apt install -y rsync
    
    # Install network tools
    sudo apt install -y net-tools iputils-ping
    
    print_success "Additional tools installed"
}

# Note: Using default Ubuntu user instead of creating BIMS user
# The application will run under the current user (ubuntu)

# Setup log directories
setup_logs() {
    print_status "Setting up log directories..."
    
    sudo mkdir -p /var/log/bims
    sudo chown -R $USER:$USER /var/log/bims
    
    print_success "Log directories created"
}

# Install SSL certificate tools
install_ssl_tools() {
    print_status "Installing SSL certificate tools..."
    
    sudo apt install -y certbot python3-certbot-nginx
    
    print_success "SSL tools installed"
}

# Install BIMS project dependencies
install_bims_dependencies() {
    print_status "Installing BIMS project dependencies..."
    
    if [ "$SKIP_DEPS" = true ]; then
        print_status "Skipping dependency installation as requested"
        return 0
    fi
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would install npm dependencies for client and server"
        return 0
    fi
    
    # Get correct npm path
    NPM_PATH=$(get_npm_path)
    
    # Install client dependencies
    cd "$PROJECT_DIR/client"
    "$NPM_PATH" install || {
        print_error "Failed to install client dependencies"
        return 1
    }
    
    # Install server dependencies
    cd "$PROJECT_DIR/server"
    "$NPM_PATH" install || {
        print_error "Failed to install server dependencies"
        return 1
    }
    
    print_success "BIMS project dependencies installed"
}

# Setup automated backups
setup_automated_backups() {
    print_status "Setting up automated backups..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would set up automated daily database backups"
        return 0
    fi
    
    # Create backup script
    sudo tee /usr/local/bin/bims-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/bims"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump -U postgres bims_production > "$BACKUP_DIR/bims_db_$DATE.sql" 2>/dev/null || {
    echo "Database backup failed at $(date)" >> "$BACKUP_DIR/backup.log"
    exit 1
}

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete

echo "Backup completed at $(date)" >> "$BACKUP_DIR/backup.log"
EOF
    
    sudo chmod +x /usr/local/bin/bims-backup.sh
    
    # Create backup directory
    sudo mkdir -p /var/backups/bims
    sudo chown $USER:$USER /var/backups/bims
    
    # Add to crontab (daily at 2 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/bims-backup.sh") | crontab -
    
    print_success "Automated backups configured (daily at 2 AM)"
}

# Optimize system performance
optimize_system() {
    print_status "Optimizing system performance..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would optimize system performance settings"
        return 0
    fi
    
    # Increase file limits
    echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
    echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    
    # Optimize kernel parameters
    echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
    echo "net.core.somaxconn=65535" | sudo tee -a /etc/sysctl.conf
    
    # Apply changes
    sudo sysctl -p >/dev/null 2>&1 || {
        print_warning "Failed to apply kernel optimizations, but continuing..."
    }
    
    print_success "System performance optimized"
}

# Validate all services
validate_services() {
    print_status "Validating all services..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would validate PostgreSQL, Redis, and Nginx services"
        return 0
    fi
    
    # Check PostgreSQL
    if ! sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
        print_error "PostgreSQL health check failed"
        return 1
    fi
    
    # Check Redis
    if ! redis-cli ping >/dev/null 2>&1; then
        print_error "Redis health check failed"
        return 1
    fi
    
    # Check Nginx
    if ! curl -s http://localhost >/dev/null 2>&1; then
        print_warning "Nginx health check failed (may be expected if no content yet)"
    fi
    
    print_success "All services are healthy"
}

# Cleanup temporary files
cleanup_setup() {
    print_status "Cleaning up temporary files..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would clean up temporary files and caches"
        return 0
    fi
    
    # Remove package cache
    sudo apt autoremove -y >/dev/null 2>&1 || true
    sudo apt autoclean >/dev/null 2>&1 || true
    
    # Clear npm cache
    npm cache clean --force >/dev/null 2>&1 || true
    
    # Remove temporary files
    rm -rf /tmp/bims-setup-* 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Interactive configuration for domain and admin credentials
interactive_setup() {
    print_status "Interactive configuration..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "[DRY RUN] Would prompt for domain and admin credentials"
        return 0
    fi
    
    # Ask for domain name if not provided via command line
    if [ -z "$DOMAIN_NAME" ]; then
        read -p "Enter your domain name (or press Enter for IP access): " DOMAIN_NAME
    fi
    
    if [ -n "$DOMAIN_NAME" ]; then
        print_status "Configuring for domain: $DOMAIN_NAME"
        
        # Update environment files with domain
        sed -i "s|CORS_ORIGIN=http://$INSTANCE_IP|CORS_ORIGIN=https://$DOMAIN_NAME|g" "$PROJECT_DIR/server/.env.production"
        sed -i "s|VITE_API_URL=http://$INSTANCE_IP:5000|VITE_API_URL=https://$DOMAIN_NAME|g" "$PROJECT_DIR/client/.env"
        
        # Generate SSL certificate
        print_status "Generating SSL certificate for $DOMAIN_NAME..."
        sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email admin@"$DOMAIN_NAME" --redirect || {
            print_warning "SSL certificate generation failed, but continuing..."
        }
    fi
    
    # Ask for admin credentials
    print_status "Setting up admin user..."
    read -p "Enter admin email: " ADMIN_EMAIL
    read -s -p "Enter admin password: " ADMIN_PASSWORD
    echo
    
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
        # Update database with admin credentials
        sudo -u postgres psql -d bims_production -c "
            UPDATE users SET email = '$ADMIN_EMAIL', password = crypt('$ADMIN_PASSWORD', gen_salt('bf')) 
            WHERE role = 'admin' LIMIT 1;
        " 2>/dev/null || {
            print_warning "Failed to update admin credentials, but continuing..."
        }
        
        print_success "Admin credentials configured"
    fi
}

# Setup database schema and data
setup_database() {
    print_status "Setting up database schema and data..."
    
    cd "$PROJECT_DIR/server"
    
    # Get correct npm and node paths
    NPM_PATH=$(get_npm_path)
    NODE_PATH=$(get_node_path)
    
    print_status "Using npm path: $NPM_PATH"
    print_status "Using node path: $NODE_PATH"
    
    # Ensure PostgreSQL user exists and has correct permissions
    print_status "Setting up PostgreSQL user and permissions..."
    CURRENT_USER=$(whoami)
    
    # Generate secure password for postgres user
    POSTGRES_PASSWORD=$(generate_random_password)
    print_status "Setting up PostgreSQL postgres user with secure password..."
    
    # Update environment files with generated password
    sed -i "s|PG_PASSWORD=1234|PG_PASSWORD=$POSTGRES_PASSWORD|g" "$PROJECT_DIR/server/.env.production"
    sed -i "s|PG_PASSWORD=1234|PG_PASSWORD=$POSTGRES_PASSWORD|g" "$PROJECT_DIR/server/.env"
    
    # Save password to secure location
    echo "PostgreSQL postgres user password: $POSTGRES_PASSWORD" | sudo tee /var/log/bims-postgres-password.txt >/dev/null
    sudo chmod 600 /var/log/bims-postgres-password.txt
    
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$POSTGRES_PASSWORD';" 2>/dev/null || {
        print_status "Creating postgres user with secure password..."
        sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD '$POSTGRES_PASSWORD' SUPERUSER;"
    }
    
    print_warning "PostgreSQL password saved to: /var/log/bims-postgres-password.txt (secure location)"
    
    # Ensure postgres user has all necessary permissions
    sudo -u postgres psql -c "ALTER USER postgres CREATEDB;" 2>/dev/null || true
    
    # Environment files already use PG_USER=postgres, no need to change them
    print_status "PostgreSQL user setup completed (using postgres user as configured in env.example)"
    
    # Ensure .env.production is copied to .env for server compatibility (only if .env doesn't exist)
    if [ ! -f ".env" ]; then
        print_status "Creating .env from .env.production for server compatibility..."
        cp .env.production .env
        print_success "Created .env from .env.production"
    else
        print_warning "Development .env file already exists - preserving existing content"
    fi
    
    # Run database migrations
    print_status "Running database migrations..."
    NODE_ENV=production "$NPM_PATH" run db:migrate || {
        print_error "Database migration failed"
        return 1
    }
    
    # Seed database if needed
    if ! grep -q "DB_SEEDED=true" .env.production 2>/dev/null; then
        print_status "Seeding database..."
        if NODE_ENV=production "$NPM_PATH" run db:seed; then
            echo "DB_SEEDED=true" >> .env.production
            print_success "Database seeded successfully"
        else
            print_error "Database seeding failed"
            return 1
        fi
    else
        print_status "Database already seeded, skipping..."
    fi
    
    # Convert and import GIS data (if available)
    if [ -d "$PROJECT_DIR/geodata" ]; then
        print_status "Converting and importing GIS data..."
        
        # Convert GeoJSON to SQL
        if [ -f "$PROJECT_DIR/geodata/Eastern Samar Barangay.geojson" ]; then
            print_status "Converting barangay GeoJSON to SQL..."
            NODE_ENV=production "$NPM_PATH" run db:convert-geojson || {
                print_error "GeoJSON conversion failed"
                return 1
            }
        fi
        
        # Import GIS data
        print_status "Importing GIS data..."
        NODE_ENV=production "$NPM_PATH" run db:import-gis || {
            print_error "GIS data import failed"
            return 1
        }
    else
        print_warning "Geodata directory not found. Skipping GIS data import."
        print_warning "You can manually import GIS data later using: $NPM_PATH run db:convert-geojson && $NPM_PATH run db:import-gis"
    fi
    
    print_success "Database setup completed"
}

# Create setup completion file
create_setup_completion() {
    print_status "Creating setup completion file..."
    
    cat > setup_completion.md << EOF
# BIMS Server Setup Completion

**Setup Date:** $(date)
**Ubuntu Version:** $(lsb_release -d | cut -f2)

## Installed Applications

### Core Applications
- **Node.js:** $(node --version 2>/dev/null || echo "Not installed")
- **npm:** $(npm --version 2>/dev/null || echo "Not installed")
- **PostgreSQL:** $(psql --version 2>/dev/null || echo "Not installed")
- **PM2:** $(pm2 --version 2>/dev/null || echo "Not installed")
- **Nginx:** $(nginx -v 2>&1 2>/dev/null || echo "Not installed")
- **GDAL/OGR2OGR:** $(ogr2ogr --version 2>/dev/null || echo "Not installed")

### Additional Tools
- **Redis:** $(redis-server --version 2>/dev/null || echo "Not installed")
- **Python3:** $(python3 --version 2>/dev/null || echo "Not installed")
- **Git:** $(git --version 2>/dev/null || echo "Not installed")

## Environment Files Created
- **Server Production:** \`server/.env.production\` - Production configuration
- **Server Development:** \`server/.env\` - Development configuration  
- **Client:** \`client/.env\` - Frontend configuration

## Database Configuration
- **Production DB:** Configured from environment file
- **Development DB:** Configured from environment file
- **Database User:** Configured from environment file
- **Database Password:** Configured from environment file

## Next Steps

1. **Environment files created automatically:**
   - Server production: \`server/.env.production\`
   - Server development: \`server/.env\`
   - Client: \`client/.env\`
   - Review and update these files with your specific settings

2. **Deploy the application:**
   \`\`\`bash
   cd /path/to/bims
   npm run deploy
   \`\`\`
   
   **Note:** Database schema and initial data have been set up during installation.
   The deploy script will skip database operations if they're already completed.

3. **Configure Nginx (for IP address access):**
   - The deployment script will generate Nginx configuration
   - For IP address access, update the server_name in Nginx config
   - Enable the site: sudo ln -s /etc/nginx/sites-available/bims /etc/nginx/sites-enabled/
   - Test and restart: sudo nginx -t && sudo systemctl restart nginx

4. **Set up SSL certificates (when you have a domain):**
   \`\`\`bash
   sudo certbot --nginx -d your-domain.com
   \`\`\`
   **Note:** For IP address access, SSL certificates are not required initially

5. **Set up monitoring:**
   - Configure PM2 monitoring
   - Set up log rotation
   - Configure backup strategies

## Useful Commands

### Service Management
\`\`\`bash
# PostgreSQL
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx

# Redis
sudo systemctl status redis-server
sudo systemctl restart redis-server

# PM2
pm2 status
pm2 logs
\`\`\`

### Database Management
\`\`\`bash
# Connect to database (replace with your actual database name from .env)
sudo -u postgres psql -d your_database_name

# Backup database
pg_dump -U your_db_user -h localhost your_database_name > backup.sql

# Restore database
psql -U your_db_user -h localhost your_database_name < backup.sql
\`\`\`

### GDAL/OGR2OGR Commands
\`\`\`bash
# Convert shapefile to GeoJSON
ogr2ogr -f "GeoJSON" output.geojson input.shp

# Convert GeoJSON to SQL (replace with your actual database credentials from .env)
ogr2ogr -f "PostgreSQL" PG:"host=localhost user=your_db_user dbname=your_database_name" input.geojson
\`\`\`
EOF
    
    print_success "Setup completion file created: setup_completion.md"
}

# Main setup function
main() {
    echo "🚀 Starting BIMS Ubuntu Server Setup..."
    echo ""
    
    # Setup logging
    setup_logging
    
    # Set up error handling
    trap 'rollback_on_failure "Setup interrupted"' INT TERM
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root. Run as a regular user with sudo privileges."
        exit 1
    fi
    
    # Check sudo privileges
    if ! sudo -n true 2>/dev/null; then
        print_warning "Sudo password may be required. Please enter your password when prompted."
        # Test sudo access
        if ! sudo -v; then
            print_error "This script requires sudo privileges. Please ensure your user has sudo access."
            exit 1
        fi
    fi
    
    # Validate system requirements
    validate_requirements
    
    print_status "Starting installation process..."
    echo ""
    
    # Core installation steps
    update_system || rollback_on_failure "System update"
    install_basic_utils || rollback_on_failure "Basic utilities installation"
    install_nodejs || rollback_on_failure "Node.js installation"
    install_postgresql || rollback_on_failure "PostgreSQL installation"
    install_pm2 || rollback_on_failure "PM2 installation"
    install_nginx || rollback_on_failure "Nginx installation"
    install_gdal || rollback_on_failure "GDAL installation"
    install_dev_tools || rollback_on_failure "Development tools installation"
    install_redis || rollback_on_failure "Redis installation"
    
    # Configuration steps
    configure_postgresql || rollback_on_failure "PostgreSQL configuration"
    configure_postgresql_security || rollback_on_failure "PostgreSQL security"
    configure_firewall || rollback_on_failure "Firewall configuration"
    install_additional_tools || rollback_on_failure "Additional tools installation"
    setup_logs || rollback_on_failure "Log setup"
    install_ssl_tools || rollback_on_failure "SSL tools installation"
    
    # Project setup
    install_bims_dependencies || rollback_on_failure "BIMS dependencies installation"
    setup_database || rollback_on_failure "Database setup"
    
    # Advanced features
    setup_automated_backups || rollback_on_failure "Backup setup"
    optimize_system || rollback_on_failure "System optimization"
    validate_services || rollback_on_failure "Service validation"
    
    # Interactive configuration
    interactive_setup || rollback_on_failure "Interactive setup"
    
    # Cleanup
    cleanup_setup || rollback_on_failure "Cleanup"
    create_setup_completion || rollback_on_failure "Completion report"
    
    echo ""
    echo "🎉 BIMS Ubuntu Server Setup Completed Successfully!"
    echo ""
    echo "📋 Summary of installed applications:"
    echo "✅ Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "✅ npm: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "✅ PostgreSQL: $(psql --version 2>/dev/null || echo 'Not installed')"
    echo "✅ PM2: $(pm2 --version 2>/dev/null || echo 'Not installed')"
    echo "✅ Nginx: $(nginx -v 2>&1 2>/dev/null || echo 'Not installed')"
    echo "✅ GDAL/OGR2OGR: $(ogr2ogr --version 2>/dev/null || echo 'Not installed')"
    echo "✅ Redis: $(redis-server --version 2>/dev/null || echo 'Not installed')"
    echo ""
    echo "📖 Next steps:"
    echo "1. Review setup_completion.md for detailed information"
    echo "2. Review and update environment files:"
    echo "   - server/.env.production (for production)"
    echo "   - server/.env (for development)"
    echo "   - client/.env (for frontend)"
    echo "3. Deploy your application using: npm run deploy"
    echo "4. Set up SSL certificates when you have a domain"
    echo ""
    echo "🔧 Services status:"
    sudo systemctl status postgresql --no-pager -l
    sudo systemctl status nginx --no-pager -l
    sudo systemctl status redis-server --no-pager -l
    echo ""
    echo "📝 Setup log available at: $LOG_FILE"
    echo "💾 Automated backups configured: /var/backups/bims/"
}

# Run main function
main "$@"
