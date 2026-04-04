# Email Setup for Forgot Password Feature

## Overview

The forgot password feature requires email configuration to send reset codes to users. This document explains how to set up email functionality.

## Required Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Database Configuration
PG_USER=postgres
PG_HOST=localhost
PG_PASSWORD=1234
PG_DATABASE=bims
PG_PORT=5432
PG_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail SMTP)
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Gmail SMTP Setup

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification

### Step 2: Generate App Password

1. Go to Google Account settings
2. Navigate to Security
3. Under "2-Step Verification", click on "App passwords"
4. Generate a new app password for "Mail"
5. Use this password as `GMAIL_PASS` in your .env file

### Step 3: Update Environment Variables

- Set `GMAIL_USER` to your Gmail address
- Set `GMAIL_PASS` to the app password generated in step 2
- Set `SMTP_FROM` to your Gmail address (or leave it blank to use GMAIL_USER)

## Testing the Email Functionality

1. Start the server: `cd server && npm run dev`
2. Navigate to the login page
3. Click "Forgot your password?"
4. Enter a valid email address
5. Check the email for the reset code

## Troubleshooting

### Common Issues:

1. **"Gmail SMTP credentials are not set"**: Make sure all email environment variables are set
2. **"Authentication failed"**: Verify your app password is correct
3. **"Network error"**: Check your internet connection and Gmail SMTP settings

### Alternative Email Providers:

You can modify `server/src/utils/email.js` to use other email providers like:

- Outlook/Hotmail
- Yahoo Mail
- Custom SMTP servers

## Security Notes

- Never commit your `.env` file to version control
- Use strong, unique app passwords
- Consider using environment-specific email configurations
- The reset code expires after 10 minutes for security
