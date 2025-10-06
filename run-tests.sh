#!/bin/bash

# Termageddon Test Runner
# Usage: ./run-tests.sh [options]
# Options:
#   -f, --frontend    Run only frontend unit tests
#   -b, --backend     Run only backend tests
#   -e, --e2e         Run only e2e tests
#   -h, --help        Show this help message
#   (no args)         Run all tests

set -e  # Exit on any error

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if we're in the right directory
check_directory() {
    if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
        print_error "This script must be run from the Termageddon project root directory"
        exit 1
    fi
}

# Function to cleanup processes
cleanup() {
    if [ ! -z "$BACKEND_PID" ]; then
        print_status "Cleaning up backend server..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    # Kill any remaining Playwright processes
    pkill -f "playwright" 2>/dev/null || true
}

# Set up cleanup trap
trap cleanup EXIT

# Function to run frontend tests
run_frontend_tests() {
    print_status "Running frontend unit tests..."
    
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found"
        return 1
    fi
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Run frontend tests
    print_status "Running Angular unit tests..."
    if npm run test -- --watch=false --browsers=ChromeHeadless; then
        print_success "Frontend unit tests passed"
    else
        print_error "Frontend unit tests failed"
        return 1
    fi
    
    cd ..
}

# Function to run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found"
        return 1
    fi
    
    cd backend
    
    # Check if virtual environment exists
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating backend virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Check if requirements are installed
    if ! python -c "import django" 2>/dev/null; then
        print_status "Installing backend dependencies..."
        pip install -r requirements.txt
    fi
    
    # Collect static files for tests
    print_status "Collecting static files..."
    python manage.py collectstatic --noinput > /dev/null 2>&1
    
    # Run backend tests
    print_status "Running backend tests with pytest..."
    if python -m pytest; then
        print_success "Backend tests passed"
    else
        print_error "Backend tests failed"
        return 1
    fi
    
    deactivate
    cd ..
}

# Function to run e2e tests
run_e2e_tests() {
    print_status "Running e2e tests..."
    
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found"
        return 1
    fi
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Check if Playwright is installed
    if ! npx playwright --version >/dev/null 2>&1; then
        print_status "Installing Playwright..."
        npx playwright install
    fi
    
    # Start backend server in background if not running
    if ! curl -s http://localhost:8000/api/ >/dev/null 2>&1; then
        print_status "Starting backend server..."
        cd ../backend
        
        # Create virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            print_status "Creating backend virtual environment..."
            python3 -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt
        else
            source venv/bin/activate
        fi
        
        # Collect static files
        print_status "Collecting static files..."
        python manage.py collectstatic --noinput > /dev/null 2>&1
        
        python manage.py runserver > ../backend.log 2>&1 &
        BACKEND_PID=$!
        cd ../frontend
        
        # Wait for backend to start
        print_status "Waiting for backend server to start..."
        sleep 5
        
        # Check if backend is running
        if ! curl -s http://localhost:8000/api/ >/dev/null 2>&1; then
            print_error "Failed to start backend server"
            kill $BACKEND_PID 2>/dev/null || true
            return 1
        fi
    else
        print_status "Backend server already running"
        BACKEND_PID=""
    fi
    
    # Run e2e tests
    print_status "Running Playwright e2e tests..."
    if npx playwright test --reporter=line; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
        # Clean up backend if we started it
        if [ ! -z "$BACKEND_PID" ]; then
            kill $BACKEND_PID 2>/dev/null || true
        fi
        return 1
    fi
    
    # Clean up backend if we started it
    if [ ! -z "$BACKEND_PID" ]; then
        print_status "Stopping backend server..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    cd ..
}

# Function to show help
show_help() {
    echo "Termageddon Test Runner"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -f, --frontend    Run only frontend unit tests"
    echo "  -b, --backend     Run only backend tests"
    echo "  -e, --e2e         Run only e2e tests"
    echo "  -h, --help        Show this help message"
    echo "  (no args)         Run all tests"
    echo ""
    echo "Examples:"
    echo "  $0                # Run all tests"
    echo "  $0 --frontend     # Run only frontend tests"
    echo "  $0 -b             # Run only backend tests"
    echo "  $0 -e             # Run only e2e tests"
}

# Main function
main() {
    # Check if we're in the right directory
    check_directory
    
    # Check for required commands
    if ! command_exists node; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command_exists python3; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Parse arguments
    case "${1:-}" in
        -f|--frontend)
            print_status "Running frontend tests only..."
            run_frontend_tests
            ;;
        -b|--backend)
            print_status "Running backend tests only..."
            run_backend_tests
            ;;
        -e|--e2e)
            print_status "Running e2e tests only..."
            run_e2e_tests
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        "")
            print_status "Running all tests..."
            
            # Track overall success
            overall_success=true
            
            # Run backend tests first
            if ! run_backend_tests; then
                overall_success=false
            fi
            
            # Run frontend tests
            if ! run_frontend_tests; then
                overall_success=false
            fi
            
            # Run e2e tests
            if ! run_e2e_tests; then
                overall_success=false
            fi
            
            # Report overall result
            if [ "$overall_success" = true ]; then
                print_success "All tests passed! 🎉"
                exit 0
            else
                print_error "Some tests failed. Check the output above for details."
                exit 1
            fi
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"