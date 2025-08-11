#!/bin/bash
set -e

echo "🚀 Setting up CQL Code Clinic development environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    print_error "Node.js version $NODE_VERSION is not supported. Please install Node.js 18+ and try again."
    exit 1
fi

print_status "Node.js version $NODE_VERSION detected"

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    print_status "Docker detected"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found. Some features may not be available."
    DOCKER_AVAILABLE=false
fi

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
npm install
print_status "Frontend dependencies installed"
cd ..

# Install shared dependencies
print_status "Installing shared dependencies..."
cd shared
npm install
print_status "Shared dependencies installed"
cd ..

# Copy environment files
print_status "Setting up environment files..."
if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    print_status "Created frontend/.env.local"
else
    print_warning "frontend/.env.local already exists, skipping"
fi

# Run type checking
print_status "Running type checks..."
npm run type-check:frontend

# Run tests
print_status "Running tests..."
npm run test:frontend -- --run

# Build shared types
print_status "Building shared types..."
cd shared
npm run build
cd ..

print_status "Development environment setup complete!"

echo ""
echo "📝 Next steps:"
echo "  1. Start the development server:"
echo "     npm run dev:frontend"
echo ""
echo "  2. When ready for backend development:"
echo "     - Set up the CQL runner (Phase 1)"
echo "     - Initialize the backend (Phase 1)"
echo ""
echo "🎉 Happy coding!"