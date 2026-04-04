#!/bin/bash

echo "🚀 Deploying to Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set environment
export NODE_ENV=development

# Build the project
echo -e "${BLUE}Building project...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Add your deployment commands here
# Examples:
# - Copy files to server
# - Run docker commands
# - Restart services
# - Update nginx config

echo ""
echo -e "${GREEN}✅ Deployment to development complete!${NC}"
echo ""
echo -e "${YELLOW}Note: Add your specific deployment commands to this script${NC}"
echo ""

