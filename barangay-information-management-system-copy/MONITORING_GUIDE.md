# BIMS System Monitoring

## Overview
The BIMS system now includes a comprehensive monitoring dashboard that provides real-time insights into system performance, health, and resource utilization.

## Access Information

### URL
The monitoring page is accessible at: `https://your-domain.com/monitoring`

### Authentication
The monitoring page requires authentication using a JWT token from an admin user account.

### How to Access

1. **Get a JWT Token:**
   - Login to the admin panel with an admin account
   - Open browser developer tools (F12)
   - Go to Application/Storage tab → Local Storage
   - Copy the `token` value

2. **Access Monitoring:**
   - Navigate to `https://your-domain.com/monitoring`
   - Enter the JWT token in the authentication form
   - Click "Access Monitoring"

## Features

### System Metrics
- **CPU Usage**: Real-time CPU utilization and load averages
- **Memory Usage**: RAM usage with detailed breakdown
- **System Uptime**: Server uptime and system information
- **Platform Details**: Hostname, OS, Node.js version

### Storage Metrics
- **Disk Usage**: Total, used, and free disk space
- **Directory Information**: File counts and sizes for uploads and logs
- **Database Size**: PostgreSQL database size

### Network Metrics
- **Network Interfaces**: Active network connections and IP addresses
- **Process Memory**: Node.js process memory usage breakdown

### Database Metrics
- **Connection Pool**: Active vs maximum database connections
- **Table Statistics**: Most active database tables
- **Performance**: Database size and usage patterns

### Application Metrics
- **Node.js Information**: Version, platform, process ID
- **Cache Status**: Redis connection and health
- **Application Uptime**: Process uptime and performance

### Health Monitoring
- **Overall Status**: System health overview
- **Component Checks**: Database, Redis, disk, memory, and uptime status
- **Real-time Alerts**: Visual indicators for system health

## Security Features

- **Token-based Authentication**: Secure JWT token validation
- **Admin-only Access**: Restricted to admin users only
- **Session Management**: Token storage in browser localStorage
- **Auto-refresh**: Automatic data refresh every 30 seconds

## Technical Details

### Backend API Endpoints
- `/api/monitoring/system` - System metrics
- `/api/monitoring/storage` - Storage metrics  
- `/api/monitoring/network` - Network metrics
- `/api/monitoring/health` - Health status
- `/api/monitoring/database` - Database metrics
- `/api/monitoring/application` - Application metrics

### Frontend Features
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Dark Theme**: Professional monitoring interface
- **Tabbed Interface**: Organized metrics by category
- **Progress Indicators**: Visual progress bars for usage metrics

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Ensure you're using a valid JWT token from an admin account
   - Check that the token hasn't expired
   - Verify the token is copied correctly

2. **Data Not Loading**
   - Check network connectivity
   - Verify the backend API is running
   - Check browser console for errors

3. **Permission Denied**
   - Ensure your account has admin privileges
   - Contact system administrator for access

### Support
For technical support or access issues, contact the system administrator.

---
*This monitoring system provides comprehensive insights into BIMS system performance and health status.*
