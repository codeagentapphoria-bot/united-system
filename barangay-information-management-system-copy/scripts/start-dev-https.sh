#!/bin/bash

# BIMS Development Server with HTTPS
# This script starts the development server with HTTPS for camera functionality

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting BIMS Development Server with HTTPS...${NC}"
echo ""

# Check if SSL certificates exist
if [ ! -f "client/localhost.pem" ] || [ ! -f "client/localhost-key.pem" ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found. Generating them...${NC}"
    cd client
    openssl req -x509 -newkey rsa:2048 -keyout localhost-key.pem -out localhost.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    cd ..
    echo -e "${GREEN}✅ SSL certificates generated successfully${NC}"
fi

# Set development mode for Vite
export NODE_ENV=development

# Start the server in the background
echo -e "${BLUE}📡 Starting backend server...${NC}"
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Wait a moment for server to start
sleep 3

# Start the client
echo -e "${BLUE}🌐 Starting frontend with HTTPS...${NC}"
cd client
npm run dev

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait 