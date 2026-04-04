#!/bin/bash

echo "🚀 Setting up Multysis v2..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${BLUE}Node.js version: $(node --version)${NC}"
echo -e "${BLUE}npm version: $(npm --version)${NC}"
echo ""

# Install root dependencies
echo -e "${GREEN}📦 Installing root dependencies...${NC}"
npm install
echo ""

# Install frontend dependencies
echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd multysis-frontend
npm install
cd ..
echo ""

# Install backend dependencies
echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
cd multysis-backend
npm install
cd ..
echo ""

# Copy environment files if they don't exist
if [ ! -f .env ]; then
    echo -e "${GREEN}📝 Creating root .env file...${NC}"
    cp .env.example .env
    echo -e "${BLUE}⚠️  Please update .env with your configuration${NC}"
fi

if [ ! -f multysis-frontend/.env ]; then
    echo -e "${GREEN}📝 Creating frontend .env file...${NC}"
    cp multysis-frontend/.env.example multysis-frontend/.env
    echo -e "${BLUE}⚠️  Please update multysis-frontend/.env with your configuration${NC}"
fi

if [ ! -f multysis-backend/.env ]; then
    echo -e "${GREEN}📝 Creating backend .env file...${NC}"
    cp multysis-backend/.env.example multysis-backend/.env
    echo -e "${BLUE}⚠️  Please update multysis-backend/.env with your configuration${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Update .env files with your configuration"
echo "2. Run 'npm run dev' to start both frontend and backend"
echo "3. Visit http://localhost:5173 for frontend"
echo "4. Visit http://localhost:3000 for backend API"
echo ""

