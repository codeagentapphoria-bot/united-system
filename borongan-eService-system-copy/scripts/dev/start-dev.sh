#!/bin/bash

echo "🚀 Starting Multysis v2 in development mode..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo -e "${BLUE}⚠️  Root .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
fi

if [ ! -f "multysis-frontend/.env" ]; then
    echo -e "${BLUE}⚠️  Frontend .env file not found. Creating from .env.example...${NC}"
    cp multysis-frontend/.env.example multysis-frontend/.env
fi

if [ ! -f "multysis-backend/.env" ]; then
    echo -e "${BLUE}⚠️  Backend .env file not found. Creating from .env.example...${NC}"
    cp multysis-backend/.env.example multysis-backend/.env
fi

echo -e "${GREEN}Starting development servers...${NC}"
echo -e "${BLUE}Frontend: http://localhost:5173${NC}"
echo -e "${BLUE}Backend: http://localhost:3000${NC}"
echo ""

# Start both servers using concurrently
npm run dev

