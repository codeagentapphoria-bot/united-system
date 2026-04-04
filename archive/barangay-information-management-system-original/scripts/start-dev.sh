#!/bin/bash
# Start development servers using concurrently
# This script starts both frontend and backend in the foreground

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Starting BIMS Development Servers..."
echo "Frontend will run on http://localhost:5173"
echo "Backend will run on http://localhost:5000"
echo ""

# Check if concurrently is installed
if ! command -v npx &> /dev/null; then
    print_error "npx is not available. Please install Node.js and npm."
    exit 1
fi

# Check if both client and server directories exist
if [ ! -d "$PROJECT_DIR/client" ]; then
    print_error "Client directory not found: $PROJECT_DIR/client"
    exit 1
fi

if [ ! -d "$PROJECT_DIR/server" ]; then
    print_error "Server directory not found: $PROJECT_DIR/server"
    exit 1
fi

print_status "Starting development servers with concurrently..."
echo ""

# Start both servers using concurrently
cd "$PROJECT_DIR"
npx concurrently \
    --names "frontend,backend" \
    --prefix-colors "blue,green" \
    --prefix "[{name}]" \
    "cd client && npm run dev" \
    "cd server && npm run dev" 