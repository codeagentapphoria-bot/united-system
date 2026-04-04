# Domain Setup Guide for BIMS

This guide explains how to configure your BIMS application to work with a custom domain name.

## 📋 Prerequisites

1. **Domain name** (e.g., `bims.yourdomain.com` or `yourdomain.com`)
2. **DNS access** to point the domain to your server IP
3. **SSL certificate** (Let's Encrypt recommended for free SSL)

## 🌐 Step 1: DNS Configuration

### Configure DNS Records

Point your domain to your server IP (`192.168.1.45`):

```
Type: A
Name: @ (or subdomain like 'bims')
Value: 192.168.1.45
TTL: 300 (or default)
```

**Examples:**
- For `bims.yourdomain.com`: Create A record with name `bims`
- For `yourdomain.com`: Create A record with name `@`

### Verify DNS Propagation

```bash
# Check if DNS is pointing to your server
nslookup yourdomain.com
# or
dig yourdomain.com
```

## 🔧 Step 2: Update Environment Configuration

### Frontend Configuration (`client/.env`)

```bash
# Update these values in client/.env
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_SERVER_URL=https://yourdomain.com
```

### Backend Configuration (`server/.env.production`)

```bash
# Update these values in server/.env.production
CORS_ORIGIN=https://yourdomain.com
```

## 🔒 Step 3: SSL Certificate Setup

### Option A: Let's Encrypt (Recommended - Free)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (optional)
sudo crontab -e
# Add this line for auto-renewal:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Option B: Self-Signed Certificate (Development Only)

```bash
# Generate self-signed certificate for your domain
sudo mkdir -p /etc/ssl/yourdomain
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/yourdomain/yourdomain-key.pem \
    -out /etc/ssl/yourdomain/yourdomain-cert.pem \
    -subj "/C=PH/ST=Eastern Samar/L=Borongan/O=BIMS/CN=yourdomain.com"
```

## 🚀 Step 4: Update Nginx Configuration

### Create Domain-Specific Nginx Config

```bash
# Create new Nginx configuration for your domain
sudo nano /etc/nginx/sites-available/yourdomain
```

### Nginx Configuration Template

```nginx
# HTTP server (redirect to HTTPS)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Backend uploads
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Backend welcome endpoint
    location /welcome {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend static files
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        
        # Cache control for different file types
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        location ~* \.(html|json)$ {
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
```

### Enable the Site

```bash
# Enable the new site
sudo ln -sf /etc/nginx/sites-available/yourdomain /etc/nginx/sites-enabled/

# Disable the old IP-based site (optional)
sudo rm -f /etc/nginx/sites-enabled/bims

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## 🔄 Step 5: Deploy with Domain Configuration

### Update Environment Files

```bash
# Update client environment
cd client
cp .env .env.backup
sed -i 's|https://192.168.1.45|https://yourdomain.com|g' .env

# Update server environment
cd ../server
cp .env.production .env.production.backup
sed -i 's|https://192.168.1.45|https://yourdomain.com|g' .env.production
```

### Deploy the Application

```bash
# Run the deployment script
./scripts/deploy.sh
```

## 🧪 Step 6: Testing

### Test Your Domain

1. **Frontend Access:** `https://yourdomain.com`
2. **API Access:** `https://yourdomain.com/api`
3. **Camera Functionality:** `https://yourdomain.com/request`
4. **SSL Certificate:** Check for padlock in browser

### Verify Functionality

```bash
# Test HTTPS redirect
curl -I http://yourdomain.com

# Test API endpoint
curl -k https://yourdomain.com/api/welcome

# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

## 🔧 Step 7: Automation Script

### Create Domain Setup Script

```bash
#!/bin/bash
# domain-setup.sh

DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo "Usage: ./domain-setup.sh yourdomain.com"
    exit 1
fi

echo "Setting up domain: $DOMAIN"

# Update environment files
sed -i "s|https://192.168.1.45|https://$DOMAIN|g" client/.env
sed -i "s|https://192.168.1.45|https://$DOMAIN|g" server/.env.production

# Get SSL certificate
sudo certbot --nginx -d $DOMAIN

# Deploy application
./scripts/deploy.sh

echo "Domain setup complete for: $DOMAIN"
```

## 📋 Troubleshooting

### Common Issues

1. **DNS Not Propagated**
   ```bash
   # Wait for DNS propagation (can take up to 48 hours)
   nslookup yourdomain.com
   ```

2. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate manually
   sudo certbot renew
   ```

3. **Nginx Configuration Errors**
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Check Nginx status
   sudo systemctl status nginx
   ```

4. **CORS Issues**
   ```bash
   # Verify CORS configuration in server/.env.production
   grep CORS_ORIGIN server/.env.production
   ```

### SSL Certificate Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
```

## 🎯 Benefits of Using a Domain

1. **Professional Appearance:** Custom domain looks more professional
2. **Better Security:** Proper SSL certificates
3. **Easier Access:** Users can remember your domain
4. **Email Integration:** Can set up email with your domain
5. **SEO Benefits:** Better for search engine optimization

## 📞 Support

If you encounter issues during domain setup:

1. Check DNS propagation: `nslookup yourdomain.com`
2. Verify SSL certificate: `openssl s_client -connect yourdomain.com:443`
3. Test Nginx configuration: `sudo nginx -t`
4. Check application logs: `pm2 logs bims-backend`

---

**Note:** Replace `yourdomain.com` with your actual domain name throughout this guide. 