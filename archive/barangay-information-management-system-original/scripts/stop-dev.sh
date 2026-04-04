#!/bin/bash
# Stop BIMS development servers
# This script stops all development processes

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

echo "🛑 Stopping BIMS Development Servers..."

# Stop frontend development server
print_status "Stopping frontend development server..."
if pkill -f "npm run dev.*client" 2>/dev/null; then
    print_success "Frontend development server stopped"
else
    print_warning "No frontend development server found"
fi

# Stop backend development server
print_status "Stopping backend development server..."
if pkill -f "npm run dev.*server" 2>/dev/null; then
    print_success "Backend development server stopped"
else
    print_warning "No backend development server found"
fi

# Stop any remaining node processes related to the project
print_status "Cleaning up any remaining development processes..."
if pkill -f "node.*server.js" 2>/dev/null; then
    print_success "Additional Node.js processes stopped"
fi

# Check for any remaining processes
REMAINING_PROCESSES=$(ps aux | grep -E "(npm run dev|node server.js)" | grep -v grep | wc -l)

if [ "$REMAINING_PROCESSES" -eq 0 ]; then
    print_success "All development servers stopped successfully"
else
    print_warning "Some processes may still be running. Check with: ps aux | grep -E '(npm run dev|node server.js)'"
fi

echo ""
echo "🎉 Development servers stopped!"
echo ""
echo "📋 To start development servers again:"
echo "  npm run dev" 