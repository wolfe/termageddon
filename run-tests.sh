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
    print_status "Running e2e tests with isolation..."
    
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
        
        # Ensure database is set up for E2E tests
        print_status "Setting up database for E2E tests..."
        python manage.py migrate --noinput
        
        # Load test data if not already present
        print_status "Loading test data..."
        python manage.py load_test_data
        
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
    
    # Start frontend server in background if not running
    if ! curl -s http://localhost:4200/ >/dev/null 2>&1; then
        print_status "Starting frontend server..."
        npm start > ../frontend.log 2>&1 &
        FRONTEND_PID=$!
        
        # Wait for frontend to start
        print_status "Waiting for frontend server to start..."
        sleep 10
        
        # Check if frontend is running
        if ! curl -s http://localhost:4200/ >/dev/null 2>&1; then
            print_error "Failed to start frontend server"
            kill $BACKEND_PID 2>/dev/null || true
            kill $FRONTEND_PID 2>/dev/null || true
            return 1
        fi
    else
        print_status "Frontend server already running"
        FRONTEND_PID=""
    fi
    
    # Verify E2E test isolation setup
    print_status "Verifying E2E test isolation setup..."
    
    # Check if global setup files exist
    if [ ! -f "e2e/global-setup.ts" ] || [ ! -f "e2e/global-teardown.ts" ]; then
        print_error "E2E test isolation files not found. Please ensure global-setup.ts and global-teardown.ts exist."
        return 1
    fi
    
    # Check if database reset command exists
    if [ ! -f "../backend/glossary/management/commands/reset_test_db.py" ]; then
        print_error "Database reset command not found. Please ensure reset_test_db.py exists."
        return 1
    fi
    
    # Run e2e tests with isolation
    print_status "Running Playwright e2e tests with isolation..."
    print_status "Note: Tests will run sequentially for proper isolation"
    
    if npx playwright test --reporter=line; then
        print_success "E2E tests passed with isolation"
    else
        print_error "E2E tests failed"
        print_status "Check the test isolation setup and ensure database reset command works"
        # Clean up servers if we started them
        if [ ! -z "$BACKEND_PID" ]; then
            kill $BACKEND_PID 2>/dev/null || true
        fi
        if [ ! -z "$FRONTEND_PID" ]; then
            kill $FRONTEND_PID 2>/dev/null || true
        fi
        return 1
    fi
    
    # Clean up servers if we started them
    if [ ! -z "$BACKEND_PID" ]; then
        print_status "Stopping backend server..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        print_status "Stopping frontend server..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    cd ..
}

# Function to test E2E isolation
test_e2e_isolation() {
    print_status "Testing E2E isolation by running tests multiple times..."
    
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
        
        # Ensure database is set up for E2E tests
        print_status "Setting up database for E2E tests..."
        python manage.py migrate --noinput
        
        # Load test data if not already present
        print_status "Loading test data..."
        python manage.py load_test_data
        
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
    
    # Verify E2E test isolation setup
    print_status "Verifying E2E test isolation setup..."
    
    # Check if global setup files exist
    if [ ! -f "e2e/global-setup.ts" ] || [ ! -f "e2e/global-teardown.ts" ]; then
        print_error "E2E test isolation files not found. Please ensure global-setup.ts and global-teardown.ts exist."
        return 1
    fi
    
    # Check if database reset command exists
    if [ ! -f "../backend/glossary/management/commands/reset_test_db.py" ]; then
        print_error "Database reset command not found. Please ensure reset_test_db.py exists."
        return 1
    fi
    
    # Run e2e tests multiple times to test isolation
    print_status "Running E2E tests 3 times to verify isolation..."
    
    local test_success=true
    for i in {1..3}; do
        print_status "Test run $i/3..."
        
        if npx playwright test term-management.spec.ts --reporter=line; then
            print_success "Test run $i passed"
        else
            print_error "Test run $i failed - isolation may not be working properly"
            test_success=false
            break
        fi
        
        # Small delay between runs
        sleep 2
    done
    
    if [ "$test_success" = true ]; then
        print_success "E2E isolation test passed! All runs succeeded."
    else
        print_error "E2E isolation test failed. Check the test isolation setup."
    fi
    
    # Clean up backend if we started it
    if [ ! -z "$BACKEND_PID" ]; then
        print_status "Stopping backend server..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    cd ..
    
    return $([ "$test_success" = true ] && echo 0 || echo 1)
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
    echo "  -i, --isolation   Test E2E isolation by running tests multiple times"
    echo "  -h, --help        Show this help message"
    echo "  (no args)         Run all tests"
    echo ""
    echo "Examples:"
    echo "  $0                # Run all tests"
    echo "  $0 --frontend     # Run only frontend tests"
    echo "  $0 -b             # Run only backend tests"
    echo "  $0 -e             # Run only e2e tests"
    echo "  $0 -i             # Test E2E isolation"
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
        -i|--isolation)
            print_status "Testing E2E isolation..."
            test_e2e_isolation
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