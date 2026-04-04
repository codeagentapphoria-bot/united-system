# 🚀 BIMS Production Deployment Guide

This guide covers the complete production deployment process for the BIMS application.

## 🏗️ Production Architecture

### How Production Works (vs Development)

| Component | Development | Production |
|-----------|-------------|------------|
| **Frontend** | Vite dev server (port 5173) | Static files served by Nginx |
| **Backend** | Node.js dev server (port 5000) | Node.js API server managed by PM2 |
| **Web Server** | None (dev servers) | Nginx reverse proxy |
| **Process Management** | Screen sessions / Manual | PM2 clustering |

### Production Flow:
```
User Request → Nginx (port 80/443) → Static Files (frontend) OR API Proxy (backend)
```

**Frontend**: Built to static files (`/build` directory) and served directly by Nginx
**Backend**: Node.js API server running on port 5000, managed by PM2
**Nginx**: Serves static frontend files and proxies `/api/*` requests to backend

### Visual Architecture:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Browser  │    │   Nginx (80/443)│    │   PM2 Backend   │
│                 │    │                 │    │   (Port 5000)   │
│  https://domain │───▶│  • Static Files │    │  • API Server   │
│                 │    │  • API Proxy    │───▶│  • Database     │
│                 │    │  • SSL/TLS      │    │  • Business     │
│                 │    │  • Rate Limit   │    │    Logic        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Static Files   │
                       │  (Frontend)     │
                       │  • HTML         │
                       │  • CSS          │
                       │  • JavaScript   │
                       │  • Assets       │
                       └─────────────────┘
```

### Request Flow:
1. **Frontend Requests** (HTML, CSS, JS, images):
   ```
   Browser → Nginx → Static Files (from /build directory)
   ```

2. **API Requests** (/api/*):
   ```
   Browser → Nginx → PM2 Backend → Database
   ```

### Why This Architecture?
- ✅ **Performance**: Static files served directly by Nginx (faster)
- ✅ **Scalability**: Backend can be scaled independently
- ✅ **Security**: Nginx handles SSL, rate limiting, security headers
- ✅ **Reliability**: PM2 ensures backend stays running
- ✅ **Caching**: Nginx can cache static assets efficiently

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: Minimum 50GB SSD
- **CPU**: 2+ cores
- **Network**: Static IP or domain name

### Software Requirements
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **PostgreSQL**: 12+ with PostGIS extension
- **Nginx**: Latest stable version
- **PM2**: Process manager (will be installed automatically)
- **Git**: For code deployment

## 🛠️ Installation Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL and PostGIS
sudo apt install -y postgresql postgresql-contrib postgis postgresql-12-postgis-3

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install build tools
sudo apt install -y build-essential python3

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE bims_production;
CREATE USER bims_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bims_production TO bims_user;

# Enable PostGIS extension
\c bims_production
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

# Exit PostgreSQL
\q
```

### 3. Application Deployment

```bash
# Clone the repository
git clone <your-repo-url> /var/www/bims
cd /var/www/bims

# Make deployment script executable
chmod +x scripts/deploy.sh

# Run the deployment script
./scripts/deploy.sh
```

## 🔧 Configuration

### 1. Production Environment Variables

Create `server/.env.production` with the following configuration:

```env
# Database Configuration
PG_USER=bims_user
PG_HOST=localhost
PG_DATABASE=bims_production
PG_PASSWORD=your_secure_password
PG_PORT=5432

# Server Configuration
PORT=5000
NODE_ENV=production
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here_make_it_long_and_random
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# CORS Configuration
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Deployment Flags
DB_SEEDED=false
GIS_DATA_IMPORTED=false
```

### 2. Nginx Configuration

The deployment script creates a basic Nginx configuration. Update `/etc/nginx/sites-available/bims`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Frontend static files
    location / {
        root /var/www/bims/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
    
    # Rate limiting configuration
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔄 Deployment Process

### Automated Deployment

```bash
# Run the deployment script
./scripts/deploy.sh
```

This script will:
1. ✅ Check prerequisites
2. ✅ Backup existing deployment
3. ✅ Install dependencies
4. ✅ Build frontend for production
5. ✅ Setup backend with PM2
6. ✅ Configure Nginx
7. ✅ Start the application

### Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Install dependencies
cd client && npm ci --production=false
cd ../server && npm ci --production=true

# 2. Build frontend
cd ../client
npm run build
mkdir -p ../build
cp -r dist/* ../build/

# 3. Setup backend
cd ../server
NODE_ENV=production npm run db:migrate
NODE_ENV=production npm run db:seed

# 4. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 📊 Monitoring and Management

### PM2 Commands

```bash
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

# Monitor resources
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Management

```bash
# Run migrations
cd server && NODE_ENV=production npm run db:migrate

# Seed database
cd server && NODE_ENV=production npm run db:seed

# Backup database
pg_dump -U bims_user -h localhost bims_production > backup_$(date +%Y%m%d).sql

# Restore database
psql -U bims_user -h localhost bims_production < backup_file.sql
```

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Database Security

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/12/main/postgresql.conf

# Add/modify these lines:
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB

# Edit client authentication
sudo nano /etc/postgresql/12/main/pg_hba.conf

# Ensure only local connections:
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

### 3. Application Security

- ✅ Use strong passwords
- ✅ Enable HTTPS
- ✅ Set up rate limiting
- ✅ Configure CORS properly
- ✅ Use environment variables for secrets
- ✅ Regular security updates

## 📈 Performance Optimization

### 1. Nginx Optimization

```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_residents_municipality_id ON residents(municipality_id);
CREATE INDEX idx_households_municipality_id ON households(municipality_id);
CREATE INDEX idx_requests_municipality_id ON requests(municipality_id);
```

### 3. PM2 Optimization

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bims-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

## 🔄 Backup Strategy

### 1. Database Backups

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/bims"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U bims_user -h localhost bims_production > $BACKUP_DIR/db_backup_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/bims

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 2. Automated Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /var/www/bims/backup.sh
```

## 🚨 Troubleshooting

### Common Issues

1. **Application not starting**
   ```bash
   pm2 logs bims-backend
   ```

2. **Database connection issues**
   ```bash
   sudo -u postgres psql -c "\l"
   ```

3. **Nginx configuration errors**
   ```bash
   sudo nginx -t
   ```

4. **Permission issues**
   ```bash
   sudo chown -R www-data:www-data /var/www/bims
   sudo chmod -R 755 /var/www/bims
   ```

### Log Locations

- **Application logs**: `/var/www/bims/server/logs/`
- **PM2 logs**: `pm2 logs`
- **Nginx logs**: `/var/log/nginx/`
- **System logs**: `journalctl -u nginx`

## 📞 Support

For production deployment issues:
1. Check the logs first
2. Review the configuration files
3. Ensure all prerequisites are met
4. Contact the development team

---

**Remember**: Always test your deployment in a staging environment first! 