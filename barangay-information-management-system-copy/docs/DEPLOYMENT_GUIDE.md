# BIMS EC2 Deployment Guide

This guide provides comprehensive step-by-step instructions for deploying the BIMS (Barangay Information Management System) application on an EC2 instance for both development and production environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Deployment Process](#detailed-deployment-process)
- [Development vs Production Workflows](#development-vs-production-workflows)
- [Post-Deployment Verification](#post-deployment-verification)
- [Security & SSL Setup](#security--ssl-setup)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Useful Commands Reference](#useful-commands-reference)

## Prerequisites

### System Requirements
- ✅ Ubuntu 20.04+ EC2 instance
- ✅ SSH access to your instance
- ✅ BIMS project code uploaded to the instance
- ✅ Sudo privileges on the instance

### Pre-Deployment Checklist
- [ ] EC2 instance running Ubuntu
- [ ] SSH key or password access configured
- [ ] BIMS project code in instance
- [ ] Security groups configured (SSH, HTTP, HTTPS)

## Quick Start

For experienced users, here's the complete deployment in one go:

```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip-address

# Navigate to project directory
cd /path/to/your/bims/project

# Complete deployment (with unified migration system)
chmod +x scripts/*.sh
npm run setup:server  # Sets up environment and dependencies
npm run db:migrate    # Unified database migration (replaces multiple old commands)
npm run deploy        # Deploys application

# Access your application
# Frontend: http://YOUR_EC2_IP
# Backend API: http://YOUR_EC2_IP/api
```

---

## Detailed Deployment Process

### Step 1: Connect to Your EC2 Instance

```bash
# Connect via SSH (replace with your instance details)
ssh -i your-key.pem ubuntu@your-ec2-ip-address

# Or if using password authentication
ssh ubuntu@your-ec2-ip-address

# Verify connection
whoami  # Should show: ubuntu
pwd     # Should show your home directory
```

### Step 2: Navigate to Your Project Directory

```bash
# Navigate to your BIMS project directory
cd /path/to/your/bims/project

# Verify you're in the correct directory
ls -la
# You should see: client/, server/, scripts/, package.json, etc.

# Check if scripts exist
ls -la scripts/
# Should show: setup.sh, deploy.sh, start-dev.sh, stop-dev.sh
```

### Step 3: Initial Server Setup (One-time only)

```bash
# Make setup script executable
chmod +x scripts/setup.sh

# Run the server setup script
npm run setup:server
# OR directly: ./scripts/setup.sh
```

**What this script does:**
- ✅ Installs Node.js 18+ LTS
- ✅ Installs PostgreSQL with PostGIS
- ✅ Installs PM2 process manager
- ✅ Installs Nginx reverse proxy
- ✅ Installs GDAL/OGR2OGR for geospatial data
- ✅ Installs Redis for caching
- ✅ Creates environment files automatically
- ✅ Configures databases and PostGIS
- ✅ Sets up firewall and security
- ✅ Installs all project dependencies

**Expected output:**
```
🏛️ BIMS Ubuntu Server Setup
==============================
[INFO] Starting installation process...

[SUCCESS] Node.js installed: v18.x.x
[SUCCESS] PostgreSQL installed: psql (PostgreSQL) x.x.x
[SUCCESS] PM2 installed: x.x.x
[SUCCESS] Nginx installed: nginx/x.x.x
[SUCCESS] GDAL/OGR2OGR installed: GDAL x.x.x
[SUCCESS] Redis installed: Redis server v=x.x.x

🎉 BIMS Ubuntu Server Setup Completed Successfully!

📋 Summary of installed applications:
✅ Node.js: v18.x.x
✅ npm: x.x.x
✅ PostgreSQL: psql (PostgreSQL) x.x.x
✅ PM2: x.x.x
✅ Nginx: nginx/x.x.x
✅ GDAL/OGR2OGR: GDAL x.x.x
✅ Redis: Redis server v=x.x.x
```

### Step 4: Review and Customize Environment Files

The setup script creates three environment files automatically:

```bash
# Review the created environment files
cat server/.env.production
cat server/.env
cat client/.env

# Edit production environment if needed
nano server/.env.production
# OR
vim server/.env.production
```

**Key things to check/customize:**

#### Server Production Environment (`server/.env.production`)
```env
# Database Configuration
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=bims_production
PG_PASSWORD=your_secure_password  # Change this!
PG_PORT=5432
PG_SSL=false

# JWT Configuration
JWT_SECRET=your_very_long_random_secret_key_here  # Generate new one!
JWT_EXPIRES_IN=1d

# Application Configuration
PORT=5000
NODE_ENV=production
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGIN=http://YOUR_EC2_IP  # Your actual IP
CORS_CREDENTIALS=true

# Email Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password
SMTP_FROM=noreply@yourdomain.com

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Client Environment (`client/.env`)
```env
# API Configuration
VITE_API_BASE_URL=http://YOUR_EC2_IP:5000/api
VITE_SERVER_URL=http://YOUR_EC2_IP:5000

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_LOGGING=true

# External API Integration
VITE_EXTERNAL_API_URL=http://3.104.0.203
VITE_EXTERNAL_API_KEY=your_api_key_here
VITE_DEBUG_API=false
```

### Step 5: Deploy the Application

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Run the deployment script
npm run deploy
# OR directly: ./scripts/deploy.sh
```

**What this script does:**
- ✅ Validates environment files exist
- ✅ Installs project dependencies
- ✅ Builds frontend for production
- ✅ Runs database migrations
- ✅ Seeds database with initial data
- ✅ Starts backend with PM2
- ✅ Configures Nginx
- ✅ Creates deployment documentation

**Expected output:**
```
🏛️ BIMS Production Deployment
================================
[INFO] Checking prerequisites...
[INFO] Checking environment files...
[INFO] Installing dependencies...
[INFO] Building frontend to static files for production...
[INFO] Setting up backend for production...
[INFO] Setting up PM2 process manager...
[INFO] Starting application with PM2...
[INFO] Setting up Nginx configuration...

🎉 Deployment completed successfully!

📋 Next steps:
1. Configure your domain in Nginx configuration
2. Set up SSL certificates (Let's Encrypt recommended)
3. Configure firewall rules
4. Set up monitoring and logging

🔗 Application URLs:
Frontend: http://YOUR_EC2_IP
Backend API: http://YOUR_EC2_IP/api
Note: When you have a domain, update Nginx configuration and these URLs

📊 PM2 Status:
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name           │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ bims-backend   │ default     │ 1.0.0   │ cluster │ 12345    │ 0s     │ 0    │ online    │ 0%       │ 25.0mb   │ ubuntu   │ disabled │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

### Step 6: Configure Nginx (if not done automatically)

```bash
# Copy the generated Nginx configuration
sudo cp /tmp/bims-nginx.conf /etc/nginx/sites-available/bims

# Enable the site
sudo ln -s /etc/nginx/sites-available/bims /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

---

## Development vs Production Workflows

### 🛠️ Development Workflow

For development work on the EC2 instance:

```bash
# Start development servers
npm run dev
# OR
./scripts/start-dev.sh

# This starts:
# - Frontend: http://YOUR_EC2_IP:5173
# - Backend: http://YOUR_EC2_IP:5000

# View logs
npm run dev:logs
# OR
screen -r bims-frontend  # Frontend logs
screen -r bims-backend   # Backend logs

# Stop development servers
npm run dev:stop
# OR
./scripts/stop-dev.sh

# Check development server status
npm run dev:status
```

### 🚀 Production Workflow

For production deployment and management:

```bash
# Deploy to production
npm run deploy

# Check application status
pm2 status
pm2 logs bims-backend

# Restart application
pm2 restart bims-backend

# Stop application
pm2 stop bims-backend

# View Nginx status
sudo systemctl status nginx
sudo nginx -t  # Test configuration
```

---

## Post-Deployment Verification

### Step 7: Verify Everything is Working

```bash
# Check if all services are running
sudo systemctl status postgresql
sudo systemctl status nginx
sudo systemctl status redis-server
pm2 status

# Check application logs
pm2 logs bims-backend
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Test database connection
sudo -u postgres psql -d bims_production -c "SELECT version();"

# Check if application is accessible
curl http://localhost:5000/api/health
curl http://YOUR_EC2_IP

# Test frontend
curl http://YOUR_EC2_IP | head -20
```

### Step 8: Test Application Functionality

```bash
# Test API endpoints
curl http://YOUR_EC2_IP/api/health
curl http://YOUR_EC2_IP/api/status

# Test database connectivity
cd server
NODE_ENV=production npm run db:migrate
NODE_ENV=production npm run db:seed
```

---

## Security & SSL Setup (Optional)

### Step 9: Set Up SSL Certificate (when you have a domain)

```bash
# Install Certbot (if not already installed)
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Update environment files for HTTPS
# Edit server/.env.production and client/.env to use https://
```

---

## Monitoring & Maintenance

### Service Management Commands

#### PM2 Management
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

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### Database Management
```bash
# Run migrations
cd server && NODE_ENV=production npm run db:migrate

# Seed database
cd server && NODE_ENV=production npm run db:seed

# Backup database
pg_dump -U postgres -h localhost bims_production > backup_$(date +%Y%m%d).sql

# Restore database
psql -U postgres -h localhost bims_production < backup_file.sql

# Connect to database
sudo -u postgres psql -d bims_production
```

#### Redis Management
```bash
# Check Redis status
sudo systemctl status redis-server

# Restart Redis
sudo systemctl restart redis-server

# Connect to Redis
redis-cli

# Test Redis
redis-cli ping  # Should return PONG
```

### Log Monitoring

```bash
# Application logs
pm2 logs bims-backend --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u postgresql -f
sudo journalctl -u redis-server -f

# PM2 logs
pm2 logs --lines 100
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Permission Denied
```bash
# Fix script permissions
chmod +x scripts/*.sh

# Fix file ownership
sudo chown -R ubuntu:ubuntu /path/to/your/bims/project
```

#### 2. Port Already in Use
```bash
# Check what's using port 5000
sudo netstat -tlnp | grep :5000
# OR
sudo lsof -i :5000

# Kill the process if needed
sudo kill -9 <PID>
```

#### 3. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database exists
sudo -u postgres psql -l

# Test connection
psql -h localhost -U postgres -d bims_production
```

#### 4. Nginx Configuration Issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### 5. PM2 Issues
```bash
# Reset PM2
pm2 delete all
pm2 kill
pm2 start ecosystem.config.js --env production

# Check PM2 logs
pm2 logs --lines 50

# Restart PM2 daemon
pm2 resurrect
```

#### 6. Environment File Issues
```bash
# Check if environment files exist
ls -la server/.env*
ls -la client/.env

# Validate environment variables
cd server && source .env.production && echo $PG_DATABASE
cd client && source .env && echo $VITE_API_BASE_URL
```

#### 7. Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for build errors
cd client && npm run build
```

#### 8. Memory Issues
```bash
# Check memory usage
free -h
htop

# Check disk space
df -h

# Check PM2 memory usage
pm2 monit
```

---

## Useful Commands Reference

### Development Commands
```bash
npm run dev          # Start development servers
npm run dev:stop     # Stop development servers
npm run dev:status   # Check development server status
npm run dev:logs     # Show log commands
npm run dev:alt      # Alternative development start
npm run dev:simple   # Simple concurrent development
```

### Production Commands
```bash
npm run deploy       # Deploy to production
npm run deploy:manual # Manual deployment process
npm run pm2:start    # Start PM2 process
npm run pm2:stop     # Stop PM2 process
npm run pm2:restart  # Restart PM2 process
npm run pm2:logs     # View PM2 logs
npm run pm2:status   # Check PM2 status
```

### Database Commands
```bash
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database
npm run db:convert-geojson # Convert GIS data
npm run db:import-gis # Import GIS data
npm run db:convert-shapefile # Convert shapefiles
npm run db:cleanup-audit # Cleanup audit system
npm run db:test-ogr2ogr # Test GDAL tools
npm run db:add-gis-code # Add GIS codes
```

### Service Management
```bash
sudo systemctl status postgresql  # PostgreSQL status
sudo systemctl status nginx       # Nginx status
sudo systemctl status redis-server # Redis status
sudo nginx -t                     # Test Nginx config
sudo systemctl restart nginx      # Restart Nginx
sudo systemctl restart postgresql # Restart PostgreSQL
sudo systemctl restart redis-server # Restart Redis
```

### Monitoring Commands
```bash
# Quick status check
pm2 status && sudo systemctl status nginx && sudo systemctl status postgresql

# View all logs
pm2 logs && sudo tail -f /var/log/nginx/error.log

# Restart everything
pm2 restart all && sudo systemctl restart nginx

# Monitor resources
htop
iotop
nethogs
```

### Backup Commands
```bash
# Database backup
pg_dump -U postgres -h localhost bims_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Application backup
tar -czf bims_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=uploads \
  --exclude=logs \
  /path/to/your/bims/project

# Environment backup
cp server/.env.production server/.env.production.backup
cp client/.env client/.env.backup
```

---

## Deployment Checklist

- ✅ [ ] Server setup completed (`npm run setup:server`)
- ✅ [ ] Environment files reviewed and customized
- ✅ [ ] Application deployed (`npm run deploy`)
- ✅ [ ] Nginx configured and enabled
- ✅ [ ] Application accessible via IP address
- ✅ [ ] Database migrations and seeding completed
- ✅ [ ] PM2 process running
- ✅ [ ] Logs checked for errors
- ✅ [ ] SSL certificate configured (if using domain)
- ✅ [ ] Firewall configured properly
- ✅ [ ] Monitoring set up
- ✅ [ ] Backup strategy implemented

---

## Performance Optimization

### 1. Enable Gzip Compression
Add to Nginx configuration:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### 2. Database Optimization
```sql
-- Analyze database performance
ANALYZE;

-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 3. PM2 Cluster Mode
The deployment script already configures PM2 in cluster mode:
```javascript
module.exports = {
  apps: [{
    name: 'bims-backend',
    script: 'server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    // ... other settings
  }]
};
```

---

## Security Considerations

### 1. Firewall Configuration
```bash
# Only allow necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
npm audit fix

# Update PM2
sudo npm update -g pm2
```

### 3. Environment Security
- Use strong, unique passwords
- Rotate JWT secrets regularly
- Keep environment files secure
- Use HTTPS in production
- Implement rate limiting

---

## Support & Resources

### Quick Troubleshooting
```bash
# Quick status check
pm2 status && sudo systemctl status nginx && sudo systemctl status postgresql

# View all logs
pm2 logs && sudo tail -f /var/log/nginx/error.log

# Restart everything
pm2 restart all && sudo systemctl restart nginx
```

### Emergency Commands
```bash
# Emergency restart
pm2 delete all && pm2 start ecosystem.config.js --env production
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Emergency backup
pg_dump -U postgres -h localhost bims_production > emergency_backup.sql
```

---

**Last Updated**: $(date)
**Version**: 2.0.0
**Maintained By**: BIMS Development Team

---

## Appendix

### Environment Variables Reference

#### Server Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `PG_USER` | Database user | `postgres` |
| `PG_HOST` | Database host | `localhost` |
| `PG_DATABASE` | Database name | `bims_production` |
| `PG_PASSWORD` | Database password | `your_secure_password` |
| `PG_PORT` | Database port | `5432` |
| `JWT_SECRET` | JWT signing secret | `your_long_random_secret` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Application port | `5000` |
| `CORS_ORIGIN` | Allowed origins | `http://your-ip` |

#### Client Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base URL | `http://your-ip:5000/api` |
| `VITE_SERVER_URL` | Server URL | `http://your-ip:5000` |
| `VITE_ENABLE_DEBUG` | Enable debug mode | `false` |
| `VITE_EXTERNAL_API_URL` | External API URL | `http://3.104.0.203` |

### File Structure
```
bims/
├── client/
│   ├── .env                    # Client environment
│   ├── env.example            # Client environment template
│   └── ...
├── server/
│   ├── .env                   # Development environment
│   ├── .env.production        # Production environment
│   ├── env.example           # Server environment template
│   └── ...
├── scripts/
│   ├── setup.sh              # Server setup script
│   ├── deploy.sh             # Production deployment script
│   ├── start-dev.sh          # Development start script
│   └── stop-dev.sh           # Development stop script
└── package.json
``` 