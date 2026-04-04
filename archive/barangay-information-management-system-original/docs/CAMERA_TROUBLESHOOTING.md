# 📷 Camera Troubleshooting Guide

## Overview

The BIMS application includes camera functionality for capturing photos of residents, households, and pets. This comprehensive guide helps resolve camera issues in all deployment environments.

## 🔍 Common Issues and Solutions

### 1. HTTPS Requirement
**Problem**: Camera doesn't work and shows "HTTPS Required" error  
**Cause**: Modern browsers require HTTPS for camera access  
**Solution**: Use the HTTPS development server or production deployment

```bash
# For development
./scripts/start-dev-https.sh

# For production
./scripts/deploy.sh

# Quick fix for production camera issues
sudo ./scripts/fix-camera-config.sh
```

### 2. Browser Permissions
**Problem**: Camera permission denied  
**Solution**: 
1. Click the camera icon in the browser address bar
2. Select "Allow" for camera access
3. Refresh the page

### 3. Browser Compatibility
**Problem**: Camera not supported error  
**Solution**: Use one of these browsers:
- Chrome (recommended)
- Firefox
- Edge
- Safari (macOS)

### 4. Camera in Use
**Problem**: "Camera is in use by another application"  
**Solution**:
1. Close other applications using the camera (Zoom, Teams, etc.)
2. Refresh the page
3. Try again

### 5. No Camera Found
**Problem**: "No camera found" error  
**Solution**:
1. Check if camera is connected
2. Ensure camera drivers are installed
3. Test camera in other applications

### 6. Nginx Configuration Issues
**Problem**: Camera stuck on "initializing camera" in production  
**Cause**: Nginx security headers blocking camera access  
**Solution**:
```bash
# Apply camera-friendly Nginx configuration
sudo ./scripts/fix-camera-config.sh

# Or run full deployment with camera fixes
./scripts/deploy.sh
```

**What this fixes**:
- Removes `Permissions-Policy` header that blocks camera access
- Adds `camera-src 'self'` to Content Security Policy
- Ensures HTTPS is properly configured for camera access

## 🌐 EC2-Specific Issues

### 1. EC2 Security Group Restrictions
**Problem**: Camera doesn't work on EC2 but works locally  
**Cause**: EC2 security groups may block camera-related traffic  
**Solution**: Configure security groups properly

```bash
# Security group rules needed:
# - HTTP (Port 80): 0.0.0.0/0
# - HTTPS (Port 443): 0.0.0.0/0
# - SSH (Port 22): Your IP only
```

### 2. Public vs Private IP Issues
**Problem**: Camera works with private IP but not public IP  
**Cause**: Browser security restrictions with public IPs  
**Solution**: Use domain name or configure properly

```bash
# Use domain name instead of IP
https://your-domain.com

# Or configure environment variables
VITE_API_BASE_URL=https://your-domain.com/api
VITE_SERVER_URL=https://your-domain.com
```

### 3. SSL Certificate Issues
**Problem**: Self-signed certificates cause camera problems  
**Cause**: Browsers block camera access with invalid certificates  
**Solution**: Use proper SSL certificates

```bash
# For development (accept self-signed)
# Click "Advanced" → "Proceed to localhost (unsafe)"

# For production (use proper certificates)
# Install Let's Encrypt or commercial SSL
```

### 4. EC2 Instance Type Limitations
**Problem**: Camera doesn't work on certain EC2 instance types  
**Cause**: Some instance types have limited camera support  
**Solution**: Use compatible instance types

**Recommended EC2 Instance Types**:
- t3.medium (2 vCPU, 4 GB RAM) - Development
- t3.large (2 vCPU, 8 GB RAM) - Production
- c6i.large (2 vCPU, 4 GB RAM) - High performance
- m6i.large (2 vCPU, 8 GB RAM) - General purpose

### 5. Network Configuration Issues
**Problem**: Camera works locally but not on EC2  
**Cause**: Network configuration problems  
**Solution**: Check network settings

```bash
# Check if ports are open
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80

# Check firewall status
sudo ufw status
```

## 🛠️ Development Setup

### Starting with HTTPS
```bash
# For development (with Vite dev server)
./scripts/start-dev-https.sh

# For production (with Nginx)
./scripts/deploy.sh

# Quick fix for camera issues (production only)
sudo ./scripts/fix-camera-config.sh
```

### Environment Configuration
Ensure your `.env` files use HTTPS URLs:

```env
# For development (Vite dev server)
VITE_API_BASE_URL=https://192.168.1.45:5173/api
VITE_SERVER_URL=https://192.168.1.45:5173

# For production (Nginx)
VITE_API_BASE_URL=https://192.168.1.45/api
VITE_SERVER_URL=https://192.168.1.45
```

## 🔧 Production Deployment

### SSL Certificate Setup
For production, ensure proper SSL certificates are configured:

1. **Nginx Configuration**:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Camera-friendly headers
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
    add_header Content-Security-Policy "camera-src 'self'";
    
    # ... other configuration
}
```

2. **Environment Variables**:
```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_SERVER_URL=https://your-domain.com
```

## 🧪 Testing Camera Functionality

### 1. Check Browser Console
Open Developer Tools (F12) and check for:
- Camera permission requests
- Error messages
- Console logs

### 2. Test Camera Access
```javascript
// Test in browser console
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('Camera working'))
  .catch(err => console.error('Camera error:', err));
```

### 3. Verify HTTPS
Check that the URL starts with `https://` or is `localhost`

### 4. Test Camera Hardware
- Try camera in other applications (Zoom, Teams, etc.)
- Check if camera works in browser's camera test page
- Verify camera drivers are installed

## 🔍 Troubleshooting Steps

### Step 1: Check HTTPS
- Ensure you're using `https://` or `localhost`
- Check browser address bar for security indicator

### Step 2: Check Permissions
- Look for camera icon in address bar
- Click and allow camera access
- Check browser settings for site permissions

### Step 3: Check Browser Console
- Open Developer Tools (F12)
- Look for error messages
- Check for camera-related logs

### Step 4: Test Camera
- Try camera in other applications
- Check if camera works in browser's camera test page
- Verify camera drivers are installed

### Step 5: Browser Settings
- Clear browser cache and cookies
- Disable browser extensions temporarily
- Try incognito/private mode

### Step 6: Network Configuration (EC2)
- Check security group settings
- Verify SSL certificate configuration
- Test with domain name instead of IP

## 📋 Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "HTTPS Required" | Not using HTTPS | Use HTTPS development server |
| "Permission denied" | Browser blocked camera | Allow camera in browser settings |
| "No camera found" | Camera not connected | Check camera connection |
| "Camera in use" | Another app using camera | Close other camera applications |
| "Not supported" | Browser doesn't support camera | Use Chrome, Firefox, or Edge |
| "SSL protocol error" | Invalid SSL certificate | Use proper SSL certificates |
| "Connection timeout" | Network issues | Check network configuration |

## 🚀 Quick Fixes

### For Development
```bash
# Start with HTTPS
./scripts/start-dev-https.sh

# Or use localhost (always works)
http://localhost:3000
```

### For Production
```bash
# Fix camera configuration
sudo ./scripts/fix-camera-config.sh

# Or redeploy with camera fixes
./scripts/deploy.sh
```

### For EC2
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx

# Update security group rules
aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 443 --cidr 0.0.0.0/0
```

## 🔧 Advanced Configuration

### Nginx Configuration for Camera
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Camera-friendly headers
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
    add_header Content-Security-Policy "camera-src 'self'; media-src 'self'";
    
    # Remove problematic headers
    # Don't add: Permissions-Policy: camera=()
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment Variables
```env
# Development
VITE_API_BASE_URL=https://localhost:5173/api
VITE_SERVER_URL=https://localhost:5173

# Production
VITE_API_BASE_URL=https://your-domain.com/api
VITE_SERVER_URL=https://your-domain.com

# EC2 with domain
VITE_API_BASE_URL=https://your-domain.com/api
VITE_SERVER_URL=https://your-domain.com
```

## 📞 Support

If you continue to have issues:

1. **Check the browser console** for detailed error messages
2. **Verify your browser supports** the MediaDevices API
3. **Ensure you're using the latest version** of a supported browser
4. **Test with a different camera** if available
5. **Check EC2 security groups** and network configuration
6. **Verify SSL certificate** configuration
7. **Test with domain name** instead of IP address

### Browser Compatibility
- ✅ Chrome 60+ (Recommended)
- ✅ Firefox 55+
- ✅ Edge 79+
- ✅ Safari 11+ (macOS)
- ❌ Internet Explorer (Not supported)

### EC2 Instance Compatibility
- ✅ t3.medium (Development)
- ✅ t3.large (Production)
- ✅ c6i.large (High performance)
- ✅ m6i.large (General purpose)
- ❌ t2.micro (Limited resources)

---

**Last Updated**: September 30, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅