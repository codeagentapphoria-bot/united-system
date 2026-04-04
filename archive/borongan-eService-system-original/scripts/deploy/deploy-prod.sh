#!/bin/bash

echo "🚀 Deploying to Production Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Confirmation prompt
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Set environment
export NODE_ENV=production

# Run tests
echo -e "${BLUE}Running tests...${NC}"
npm run test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed. Deployment aborted.${NC}"
    exit 1
fi

# Build the project
echo -e "${BLUE}Building project...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Deployment aborted.${NC}"
    exit 1
fi

# Add your production deployment commands here
# Examples:
# - Push to production server
# - Deploy to cloud platform (AWS, Azure, GCP)
# - Update production database
# - Clear CDN cache
# - Restart production services

echo ""
echo -e "${GREEN}✅ Deployment to production complete!${NC}"
echo ""
echo -e "${YELLOW}Note: Add your specific production deployment commands to this script${NC}"
echo ""

