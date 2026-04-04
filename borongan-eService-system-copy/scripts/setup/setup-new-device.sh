#!/bin/bash

# Multysis v2 - New Device Setup Script
# This script automates the setup process for a new device

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Multysis v2 - New Device Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 not found"
        return 1
    fi
}

MISSING_DEPS=0

check_command node || MISSING_DEPS=1
check_command npm || MISSING_DEPS=1
check_command psql || MISSING_DEPS=1
check_command git || MISSING_DEPS=1

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}Please install missing dependencies before continuing.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version 18 or higher is required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js version: $(node -v)"

# Check npm version
NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 9 ]; then
    echo -e "${RED}npm version 9 or higher is required. Current: $(npm -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm version: $(npm -v)"

echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$PROJECT_ROOT"

echo -e "${BLUE}Installing root dependencies...${NC}"
npm install

echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd "$PROJECT_ROOT/multysis-frontend"
npm install

echo -e "${BLUE}Installing backend dependencies...${NC}"
cd "$PROJECT_ROOT/multysis-backend"
npm install

echo ""

# Check for .env files
echo -e "${YELLOW}Checking environment files...${NC}"

if [ ! -f "$PROJECT_ROOT/multysis-backend/.env" ]; then
    echo -e "${YELLOW}⚠${NC} Backend .env file not found"
    echo -e "${BLUE}Creating backend .env from example...${NC}"
    
    if [ -f "$PROJECT_ROOT/multysis-backend/.env.example" ]; then
        cp "$PROJECT_ROOT/multysis-backend/.env.example" "$PROJECT_ROOT/multysis-backend/.env"
        echo -e "${YELLOW}⚠${NC} Please edit multysis-backend/.env with your configuration"
    else
        echo -e "${YELLOW}⚠${NC} .env.example not found. Creating basic .env file..."
        cat > "$PROJECT_ROOT/multysis-backend/.env" << EOF
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multysis?schema=public
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:5173
API_BASE_URL=http://localhost:3000
EOF
        echo -e "${GREEN}✓${NC} Created basic .env file with generated JWT_SECRET"
    fi
else
    echo -e "${GREEN}✓${NC} Backend .env file exists"
fi

if [ ! -f "$PROJECT_ROOT/multysis-frontend/.env" ]; then
    echo -e "${YELLOW}⚠${NC} Frontend .env file not found"
    echo -e "${BLUE}Creating frontend .env from example...${NC}"
    
    if [ -f "$PROJECT_ROOT/multysis-frontend/.env.example" ]; then
        cp "$PROJECT_ROOT/multysis-frontend/.env.example" "$PROJECT_ROOT/multysis-frontend/.env"
    else
        cat > "$PROJECT_ROOT/multysis-frontend/.env" << EOF
VITE_API_BASE_URL=http://localhost:3000/api
VITE_MOCK_API=false
EOF
    fi
    echo -e "${GREEN}✓${NC} Created frontend .env file"
else
    echo -e "${GREEN}✓${NC} Frontend .env file exists"
fi

echo ""

# Database setup
echo -e "${YELLOW}Database setup...${NC}"

# Check if database exists
cd "$PROJECT_ROOT/multysis-backend"
source .env 2>/dev/null || true

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}⚠${NC} DATABASE_URL not set in .env file"
    echo -e "${YELLOW}Please set DATABASE_URL in multysis-backend/.env before continuing${NC}"
    exit 1
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${BLUE}Checking if database '$DB_NAME' exists...${NC}"

if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Database '$DB_NAME' exists and is accessible"
else
    echo -e "${YELLOW}⚠${NC} Database '$DB_NAME' does not exist or is not accessible"
    echo -e "${BLUE}Attempting to create database...${NC}"
    
    # Extract connection details
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || {
        echo -e "${YELLOW}⚠${NC} Could not create database automatically"
        echo -e "${BLUE}Please create the database manually:${NC}"
        echo -e "  createdb -U postgres $DB_NAME"
        echo ""
        read -p "Press Enter after creating the database, or Ctrl+C to exit..."
    }
fi

echo ""

# Generate Prisma Client
echo -e "${YELLOW}Generating Prisma Client...${NC}"
cd "$PROJECT_ROOT/multysis-backend"
npx prisma generate

echo ""

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
echo -e "${BLUE}This may take a few moments...${NC}"

if npm run db:migrate 2>&1 | tee /tmp/migrate.log; then
    echo -e "${GREEN}✓${NC} Migrations completed successfully"
else
    echo -e "${YELLOW}⚠${NC} Migration failed. Checking for collation issues..."
    
    if grep -q "collation version mismatch" /tmp/migrate.log; then
        echo -e "${BLUE}Attempting to fix collation issue...${NC}"
        npx prisma db push --accept-data-loss
        npx prisma generate
        echo -e "${GREEN}✓${NC} Schema pushed successfully"
    else
        echo -e "${RED}✗${NC} Migration failed. Please check the error above."
        echo -e "${YELLOW}You may need to manually run: npm run db:migrate${NC}"
    fi
fi

echo ""

# Seed database
echo -e "${YELLOW}Seeding database...${NC}"
read -p "Do you want to seed the database with initial data? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if npm run db:seed; then
        echo -e "${GREEN}✓${NC} Database seeded successfully"
    else
        echo -e "${YELLOW}⚠${NC} Seeding failed. You can run it manually later: npm run db:seed"
    fi
else
    echo -e "${BLUE}Skipping database seed. Run 'npm run db:seed' later if needed.${NC}"
fi

echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Review environment files:${NC}"
echo -e "   - multysis-backend/.env"
echo -e "   - multysis-frontend/.env"
echo ""
echo -e "2. ${YELLOW}Start the development servers:${NC}"
echo -e "   ${BLUE}From project root:${NC}"
echo -e "   npm run dev"
echo ""
echo -e "   ${BLUE}Or separately:${NC}"
echo -e "   Terminal 1: cd multysis-backend && npm run dev"
echo -e "   Terminal 2: cd multysis-frontend && npm run dev"
echo ""
echo -e "3. ${YELLOW}Access the application:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "   Backend:  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "4. ${YELLOW}Open Prisma Studio (optional):${NC}"
echo -e "   cd multysis-backend && npm run db:studio"
echo ""
echo -e "${BLUE}For detailed setup instructions, see:${NC}"
echo -e "   ${GREEN}SETUP_GUIDE.md${NC}"
echo ""

