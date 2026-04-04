# 🛠️ BIMS Scripts

## Overview

This directory contains essential deployment and development scripts for the BIMS project. All unnecessary scripts have been removed for a clean, maintainable structure.

## 📋 Essential Scripts

### 🚀 Deployment Scripts
- **[setup.sh](setup.sh)** - Complete server setup (one-time)
- **[deploy.sh](deploy.sh)** - Production deployment (original)
- **[deploy-improved.sh](deploy-improved.sh)** - Enhanced production deployment
- **[backup.sh](backup.sh)** - Comprehensive backup system
- **[domain-setup.sh](domain-setup.sh)** - Domain configuration setup

### 🛠️ Development Scripts
- **[start-dev.sh](start-dev.sh)** - Start development servers
- **[start-dev-https.sh](start-dev-https.sh)** - Start development with HTTPS
- **[stop-dev.sh](stop-dev.sh)** - Stop development servers

### 🔧 Utility Scripts
- **[fix-camera-config.sh](fix-camera-config.sh)** - Fix camera configuration issues

### 📁 Configuration
- **[config/deploy.production.sh](config/deploy.production.sh)** - Production deployment configuration

## 🚀 Quick Start

### First Time Setup
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run server setup (one-time only)
./scripts/setup.sh

# Deploy application
./scripts/deploy.sh
```

### Development
```bash
# Start development servers
./scripts/start-dev.sh

# Start with HTTPS (for camera testing)
./scripts/start-dev-https.sh

# Stop development servers
./scripts/stop-dev.sh
```

### Production Deployment
```bash
# Deploy to production (enhanced version)
./scripts/deploy-improved.sh

# Or use original version
./scripts/deploy.sh

# Create backup before deployment
./scripts/backup.sh

# Setup domain (when you have a domain)
./scripts/domain-setup.sh yourdomain.com
```

## 📖 Script Descriptions

### setup.sh
**Purpose**: Complete server setup (run once)
**What it does**:
- Installs Node.js, PostgreSQL, PostGIS, PM2, Nginx
- Creates environment files
- Sets up databases and PostGIS
- Configures firewall and security

### deploy.sh
**Purpose**: Production deployment (original version)
**What it does**:
- Validates environment files
- Installs dependencies
- Builds frontend for production
- Runs database migrations
- Starts application with PM2
- Configures Nginx
- Includes backup functionality

### deploy-improved.sh
**Purpose**: Enhanced production deployment
**What it does**:
- Clean deployment process (backup separated)
- Enhanced health checks
- Better error handling
- Service verification
- Improved logging
- Post-deployment verification

### backup.sh
**Purpose**: Comprehensive backup system
**What it does**:
- Backs up frontend and backend files
- Creates database backup (PostgreSQL)
- Backs up configuration files
- Backs up log files
- Generates metadata and restoration guide
- Creates compressed archives
- Automatic cleanup of old backups

### start-dev.sh
**Purpose**: Start development servers
**What it does**:
- Starts frontend development server (port 5173)
- Starts backend development server (port 5000)
- Enables hot reload for development

### start-dev-https.sh
**Purpose**: Start development with HTTPS
**What it does**:
- Starts development servers with HTTPS
- Enables camera functionality
- Uses self-signed certificates

### stop-dev.sh
**Purpose**: Stop development servers
**What it does**:
- Stops frontend development server
- Stops backend development server
- Cleans up processes

### domain-setup.sh
**Purpose**: Configure custom domain
**What it does**:
- Updates environment files for domain
- Gets SSL certificate with Let's Encrypt
- Configures Nginx for domain
- Deploys application

### fix-camera-config.sh
**Purpose**: Fix camera configuration issues
**What it does**:
- Updates Nginx configuration for camera access
- Removes problematic security headers
- Enables camera functionality
- Restarts Nginx

## 🔧 Script Usage Examples

### Complete Setup from Scratch
```bash
# 1. Setup server (one-time)
./scripts/setup.sh

# 2. Deploy application
./scripts/deploy.sh

# 3. Access application
# Frontend: http://YOUR_IP
# Backend: http://YOUR_IP/api
```

### Development Workflow
```bash
# Start development
./scripts/start-dev.sh

# Make changes to code
# Frontend: http://localhost:5173
# Backend: http://localhost:5000

# Stop development
./scripts/stop-dev.sh
```

### Camera Testing
```bash
# Start with HTTPS for camera testing
./scripts/start-dev-https.sh

# Test camera functionality
# https://localhost:5173

# Fix camera issues in production
sudo ./scripts/fix-camera-config.sh
```

### Domain Setup
```bash
# Setup custom domain
./scripts/domain-setup.sh yourdomain.com

# Access with domain
# https://yourdomain.com
```

## ⚠️ Important Notes

### Script Permissions
All scripts must be executable:
```bash
chmod +x scripts/*.sh
```

### Environment Files
Scripts expect these environment files:
- `server/.env` - Development environment
- `server/.env.production` - Production environment
- `client/.env` - Frontend environment

### Sudo Requirements
Some scripts require sudo privileges:
- `setup.sh` - For installing system packages
- `fix-camera-config.sh` - For modifying Nginx configuration
- `domain-setup.sh` - For SSL certificate setup

### Script Dependencies
Scripts depend on:
- `npm` - Node.js package manager
- `pm2` - Process manager (installed by setup.sh)
- `nginx` - Web server (installed by setup.sh)
- `certbot` - SSL certificates (for domain setup)

## 🚨 Troubleshooting

### Permission Denied
```bash
# Fix script permissions
chmod +x scripts/*.sh
```

### Script Not Found
```bash
# Ensure you're in the project root
cd /path/to/your/bims/project
```

### Environment Files Missing
```bash
# Run setup first
./scripts/setup.sh
```

### Port Already in Use
```bash
# Stop development servers
./scripts/stop-dev.sh

# Or kill processes manually
sudo lsof -ti:5000 | xargs kill -9
sudo lsof -ti:5173 | xargs kill -9
```

## 📞 Support

### Script Issues
1. Check script permissions: `ls -la scripts/`
2. Verify environment files exist
3. Check script logs for errors
4. Ensure you're in the correct directory

### Getting Help
- Check [Documentation Index](../docs/INDEX.md)
- Review [Quick Reference](../docs/QUICK_REFERENCE.md)
- Consult [Deployment Guide](../docs/DEPLOYMENT_GUIDE.md)

---

**Scripts Status**: ✅ **CLEAN & ENHANCED**  
**Last Updated**: September 30, 2025  
**Total Scripts**: 10 essential scripts  
**Status**: Production Ready 🚀  
**New Features**: Backup system separated, Enhanced deployment script