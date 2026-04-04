#!/bin/bash

echo "🧹 Cleaning Multysis v2..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Clean root node_modules
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}Removing root node_modules...${NC}"
    rm -rf node_modules
fi

# Clean root package-lock.json
if [ -f "package-lock.json" ]; then
    echo -e "${YELLOW}Removing root package-lock.json...${NC}"
    rm -f package-lock.json
fi

# Clean frontend
if [ -d "multysis-frontend/node_modules" ]; then
    echo -e "${YELLOW}Removing frontend node_modules...${NC}"
    rm -rf multysis-frontend/node_modules
fi

if [ -f "multysis-frontend/package-lock.json" ]; then
    echo -e "${YELLOW}Removing frontend package-lock.json...${NC}"
    rm -f multysis-frontend/package-lock.json
fi

if [ -d "multysis-frontend/dist" ]; then
    echo -e "${YELLOW}Removing frontend dist...${NC}"
    rm -rf multysis-frontend/dist
fi

# Clean backend
if [ -d "multysis-backend/node_modules" ]; then
    echo -e "${YELLOW}Removing backend node_modules...${NC}"
    rm -rf multysis-backend/node_modules
fi

if [ -f "multysis-backend/package-lock.json" ]; then
    echo -e "${YELLOW}Removing backend package-lock.json...${NC}"
    rm -f multysis-backend/package-lock.json
fi

if [ -d "multysis-backend/dist" ]; then
    echo -e "${YELLOW}Removing backend dist...${NC}"
    rm -rf multysis-backend/dist
fi

# Clean logs
if [ -d "multysis-backend/logs" ]; then
    echo -e "${YELLOW}Cleaning backend logs...${NC}"
    rm -f multysis-backend/logs/*.log
fi

# Clean uploads (optional - be careful with this)
# if [ -d "multysis-backend/uploads" ]; then
#     echo -e "${YELLOW}Cleaning uploads...${NC}"
#     rm -rf multysis-backend/uploads/*
# fi

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "Run 'npm run setup' to reinstall dependencies"
echo ""

