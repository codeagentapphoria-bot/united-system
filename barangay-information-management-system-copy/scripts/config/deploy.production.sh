#!/bin/bash

# Production Environment Configuration
# This file contains production-specific overrides for the deployment script

# =============================================================================
# PRODUCTION-SPECIFIC SETTINGS
# =============================================================================

# Deployment environment
DEPLOYMENT_ENV="production"
DEPLOYMENT_MODE="full"

# Application configuration
PM2_APP_NAME="bims-backend"
PM2_INSTANCES="auto"  # Will be calculated based on system resources
PM2_MAX_MEMORY="2G"   # Higher memory limit for production
PM2_RESTART_DELAY="5000"
PM2_MAX_RESTARTS="15"
PM2_MIN_UPTIME="30s"

# Backup & retention
BACKUP_RETENTION_DAYS="30"  # Keep backups longer in production
BACKUP_DATABASE="true"
BACKUP_FILES="true"
BACKUP_COMPRESS="true"

# Health checks & monitoring
HEALTH_CHECK_ENABLED="true"
HEALTH_CHECK_TIMEOUT="60"   # Longer timeout for production
HEALTH_CHECK_RETRIES="10"   # More retries for production
HEALTH_CHECK_DELAY="10"     # Longer delay between retries
HEALTH_CHECK_ENDPOINT="/api/health"

# Error handling & recovery
MAX_RETRY_ATTEMPTS="5"      # More retries for production
ENABLE_ROLLBACK="true"
ROLLBACK_ON_FAILURE="true"
CONTINUE_ON_ERROR="false"   # Stop on errors in production

# Security configuration
SSL_PROVIDER="letsencrypt"  # Use Let's Encrypt for production
SSL_CERT_PATH="/etc/letsencrypt/live/your-domain.com/fullchain.pem"
SSL_KEY_PATH="/etc/letsencrypt/live/your-domain.com/privkey.pem"
SSL_COUNTRY="PH"
SSL_STATE="Eastern Samar"
SSL_CITY="Borongan"
SSL_ORGANIZATION="BIMS"
SSL_DAYS="90"              # Let's Encrypt certificates are valid for 90 days

# Database security
DB_PASSWORD_MIN_LENGTH="16"
DB_PASSWORD_COMPLEXITY="true"

# File permissions
FILE_PERMISSIONS="640"      # More restrictive in production
DIRECTORY_PERMISSIONS="750"
WEB_USER="www-data"
WEB_GROUP="www-data"

# Network & web server
NGINX_ENABLED="true"
NGINX_CLIENT_MAX_BODY_SIZE="50M"  # Lower limit for production
NGINX_PROXY_TIMEOUT="60s"
NGINX_PROXY_CONNECT_TIMEOUT="30s"

# Port configuration
BACKEND_PORT="5000"
FRONTEND_PORT="80"
HTTPS_PORT="443"

# Build & deployment
NODE_ENV="production"
NPM_CACHE_CLEAN="true"      # Clean cache in production
BUILD_OPTIMIZATION="true"
ENABLE_GZIP="true"
ENABLE_CACHE="true"

# Logging & debugging
LOG_LEVEL="warn"            # Less verbose in production
ENABLE_VERBOSE_LOGGING="false"
LOG_RETENTION_DAYS="90"     # Keep logs longer in production
ENABLE_DEBUG_MODE="false"

# Email & notifications
ENABLE_EMAIL_NOTIFICATIONS="true"
EMAIL_ON_SUCCESS="true"
EMAIL_ON_FAILURE="true"
GMAIL_PASS_KEEP_SPACES="true"

# Performance & optimization
ENABLE_PM2_MONITORING="true"
ENABLE_NGINX_CACHE="true"
ENABLE_BROTLI_COMPRESSION="true"
OPTIMIZE_IMAGES="true"

# =============================================================================
# PRODUCTION-SPECIFIC FUNCTIONS
# =============================================================================

# Production-specific health check
production_health_check() {
    local endpoint="$1"
    
    # Additional production health checks
    print_status "Performing production-specific health checks..."
    
    # Check response time
    local response_time=$(curl -w "%{time_total}" -o /dev/null -s "$endpoint")
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        print_success "Response time acceptable: ${response_time}s"
    else
        print_warning "Response time slow: ${response_time}s"
    fi
    
    # Check SSL certificate expiry
    if [[ "$SSL_PROVIDER" == "letsencrypt" ]]; then
        local cert_expiry=$(sudo openssl x509 -enddate -noout -in "$SSL_CERT_PATH" | cut -d= -f2)
        print_info "SSL certificate expires: $cert_expiry"
    fi
}

# Production-specific backup
production_backup() {
    print_status "Creating production backup..."
    
    # Additional production backup steps
    # Backup logs
    if [[ -d "$PROJECT_DIR/server/logs" ]]; then
        cp -r "$PROJECT_DIR/server/logs" "$BACKUP_DIR/"
    fi
    
    # Backup PM2 configuration
    if [[ -f "$PROJECT_DIR/server/ecosystem.config.cjs" ]]; then
        cp "$PROJECT_DIR/server/ecosystem.config.cjs" "$BACKUP_DIR/"
    fi
    
    # Backup Nginx configuration
    if [[ -f "/etc/nginx/sites-available/bims" ]]; then
        sudo cp "/etc/nginx/sites-available/bims" "$BACKUP_DIR/nginx-bims.conf"
    fi
}

# Production-specific security checks
production_security_check() {
    print_status "Performing production security checks..."
    
    # Check file permissions
    local insecure_files=$(find "$PROJECT_DIR" -type f -perm /o+w 2>/dev/null | wc -l)
    if [[ $insecure_files -eq 0 ]]; then
        print_success "File permissions are secure"
    else
        print_warning "Found $insecure_files files with insecure permissions"
    fi
    
    # Check for sensitive files
    local sensitive_files=$(find "$PROJECT_DIR" -name "*.env*" -o -name "*.key" -o -name "*.pem" 2>/dev/null | wc -l)
    print_info "Found $sensitive_files sensitive files"
    
    # Check SSL configuration
    if [[ "$SSL_PROVIDER" == "letsencrypt" ]]; then
        if [[ -f "$SSL_CERT_PATH" && -f "$SSL_KEY_PATH" ]]; then
            print_success "SSL certificates are properly configured"
        else
            print_error "SSL certificates are missing"
        fi
    fi
} 