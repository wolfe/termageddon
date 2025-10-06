#!/bin/bash

# Termageddon Demo Script
# This script resets the database, launches backend and frontend, and opens Chrome

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Store PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers and cleaning up...${NC}"
    
    # Kill any existing processes on our ports
    echo -e "${BLUE}  → Killing any existing processes on ports 8000 and 4200...${NC}"
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:4200 | xargs kill -9 2>/dev/null || true
    
    # Kill our tracked processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Backend stopped${NC}"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    fi
    
    # Clear Angular dev server cache
    echo -e "${BLUE}  → Clearing Angular dev server cache...${NC}"
    cd frontend
    npx ng cache clean 2>/dev/null || true
    rm -rf .angular dist node_modules/.angular 2>/dev/null || true
    cd ..
    
    echo -e "${GREEN}Demo stopped and cleaned up. Goodbye!${NC}"
}

# Set up trap for cleanup on script exit
trap cleanup EXIT INT TERM

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Termageddon Demo Launcher         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Step 0: Clean up any existing processes
echo -e "${YELLOW}[0/5] Cleaning up any existing processes...${NC}"
echo -e "${BLUE}  → Killing any processes on ports 8000 and 4200...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:4200 | xargs kill -9 2>/dev/null || true

# Clear Angular dev server cache
echo -e "${BLUE}  → Clearing Angular dev server cache...${NC}"
cd frontend
npx ng cache clean 2>/dev/null || true
rm -rf .angular dist node_modules/.angular 2>/dev/null || true
cd ..
echo -e "${GREEN}  ✓ Cleanup complete${NC}"
echo ""

# Step 1: Reset Django Database
echo -e "${YELLOW}[1/6] Resetting Django database...${NC}"
cd backend

# Delete existing database
if [ -f "db.sqlite3" ]; then
    rm db.sqlite3
    echo -e "${GREEN}  ✓ Deleted old database${NC}"
fi

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo -e "${BLUE}  → Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}  ✓ Virtual environment created${NC}"
    
    # Install dependencies
    echo -e "${BLUE}  → Installing dependencies...${NC}"
    source venv/bin/activate
    pip install -r requirements.txt > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Dependencies installed${NC}"
else
    # Activate virtual environment
    source venv/bin/activate
fi

# Run migrations
echo -e "${BLUE}  → Running migrations...${NC}"
python manage.py migrate --no-input > /dev/null 2>&1
echo -e "${GREEN}  ✓ Migrations applied${NC}"

# Collect static files
echo -e "${BLUE}  → Collecting static files...${NC}"
python manage.py collectstatic --noinput > /dev/null 2>&1
echo -e "${GREEN}  ✓ Static files collected${NC}"

# Load test data
echo -e "${BLUE}  → Loading test data...${NC}"
python manage.py load_test_data > /dev/null 2>&1
echo -e "${GREEN}  ✓ Test data loaded (360 entries, 10 users)${NC}"

cd ..
echo ""

# Step 2: Start Backend Server
echo -e "${YELLOW}[2/6] Starting Django backend server...${NC}"
cd backend

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo -e "${BLUE}  → Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}  ✓ Virtual environment created${NC}"
    
    # Install dependencies
    echo -e "${BLUE}  → Installing dependencies...${NC}"
    source venv/bin/activate
    pip install -r requirements.txt > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Dependencies installed${NC}"
    
    # Collect static files
    echo -e "${BLUE}  → Collecting static files...${NC}"
    python manage.py collectstatic --noinput > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Static files collected${NC}"
else
    source venv/bin/activate
fi

python manage.py runserver > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}  ✓ Backend started on http://localhost:8000 (PID: $BACKEND_PID)${NC}"
echo ""

# Step 3: Start Frontend Server
echo -e "${YELLOW}[3/6] Starting Angular frontend server...${NC}"
cd frontend
npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}  ✓ Frontend building and starting on http://localhost:4200 (PID: $FRONTEND_PID)${NC}"
echo ""

# Step 4: Wait for servers to be ready
echo -e "${YELLOW}[4/6] Waiting for servers to be ready...${NC}"

# Wait for backend
echo -e "${BLUE}  → Waiting for backend (max 30s)...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/api/ > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}  ✗ Backend failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# Wait for frontend (it takes longer to build)
echo -e "${BLUE}  → Waiting for frontend (max 60s)...${NC}"
for i in {1..60}; do
    if curl -s http://localhost:4200 > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Frontend is ready!${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}  ✗ Frontend failed to start${NC}"
        exit 1
    fi
    sleep 1
done
echo ""

# Step 5: Open Chrome with both tabs
echo -e "${YELLOW}[5/6] Opening Chrome browser...${NC}"

# Check if Chrome is installed
if command -v open &> /dev/null && [ -d "/Applications/Google Chrome.app" ]; then
    # macOS - Open multiple windows for testing
    echo -e "${BLUE}  → Opening Chrome windows for testing...${NC}"
    
    # Window 1: Admin interface
    open -a "Google Chrome" "http://localhost:8000/admin/"
    sleep 2
    
    # Window 2: Frontend as domain expert (Maria Flores)
    open -a "Google Chrome" "http://localhost:4200"
    sleep 2
    
    # Window 3: Frontend as regular user (Ben Carter) 
    open -a "Google Chrome" "http://localhost:4200"
    
    echo -e "${GREEN}  ✓ Chrome opened with 3 windows:${NC}"
    echo -e "    ${BLUE}•${NC} Django Admin (admin/admin)"
    echo -e "    ${BLUE}•${NC} Frontend Window 1 (login as mariacarter/mariacarter)"
    echo -e "    ${BLUE}•${NC} Frontend Window 2 (login as bencarter/bencarter)"
    
elif command -v google-chrome &> /dev/null; then
    # Linux with google-chrome
    google-chrome "http://localhost:8000/admin/" &
    sleep 2
    google-chrome "http://localhost:4200" &
    sleep 2  
    google-chrome "http://localhost:4200" &
    echo -e "${GREEN}  ✓ Chrome opened with 3 windows${NC}"
elif command -v chromium-browser &> /dev/null; then
    # Linux with chromium
    chromium-browser "http://localhost:8000/admin/" &
    sleep 2
    chromium-browser "http://localhost:4200" &
    sleep 2
    chromium-browser "http://localhost:4200" &
    echo -e "${GREEN}  ✓ Chromium opened with 3 windows${NC}"
else
    echo -e "${YELLOW}  ⚠ Chrome not found. Please open manually:${NC}"
    echo -e "    ${BLUE}http://localhost:8000/admin/${NC}"
    echo -e "    ${BLUE}http://localhost:4200${NC} (Window 1 - login as mariacarter)"
    echo -e "    ${BLUE}http://localhost:4200${NC} (Window 2 - login as bencarter)"
fi
echo ""

# Display summary
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Demo is Running!              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Backend API:${NC}       http://localhost:8000/api/"
echo -e "${GREEN}✓ Django Admin:${NC}      http://localhost:8000/admin/"
echo -e "${GREEN}✓ Frontend App:${NC}      http://localhost:4200"
echo ""
echo -e "${YELLOW}Login Credentials:${NC}"
echo -e "  ${BLUE}Admin:${NC}     admin / admin"
echo ""
echo -e "${YELLOW}Test Users (password = username):${NC}"
echo -e "  ${BLUE}•${NC} mariacarter     (Maria Carter) - ${GREEN}Domain Expert: Physics, Chemistry${NC}"
echo -e "  ${BLUE}•${NC} bencarter       (Ben Carter) - ${GREEN}Domain Expert: Chemistry, Biology${NC}"
echo -e "  ${BLUE}•${NC} sofiarossi      (Sofia Rossi) - ${GREEN}Domain Expert: Computer Science, Graph Theory${NC}"
echo -e "  ${BLUE}•${NC} leoschmidt      (Leo Schmidt) - ${GREEN}Domain Expert: Biology, Geology${NC}"
echo -e "  ${BLUE}•${NC} kenjitanaka     (Kenji Tanaka) - ${GREEN}Domain Expert: Physics, Geology${NC}"
echo -e "  ${BLUE}•${NC} aishakhan       (Aisha Khan)"
echo -e "  ${BLUE}•${NC} samuelgreene    (Samuel Greene)"
echo -e "  ${BLUE}•${NC} ivanpetrov      (Ivan Petrov)"
echo -e "  ${BLUE}•${NC} chloedubois     (Chloe Dubois)"
echo ""
echo -e "${YELLOW}Test Data:${NC}"
echo -e "  ${BLUE}•${NC} 360 glossary entries with realistic approval states:"
echo -e "    ${BLUE}  -${NC} ~20% No approvals (draft state)"
echo -e "    ${BLUE}  -${NC} ~25% One approval (pending)"
echo -e "    ${BLUE}  -${NC} ~35% Two approvals (ready to publish)"
echo -e "    ${BLUE}  -${NC} ~20% Published (active definitions)"
echo -e "  ${BLUE}•${NC} 9 domains (Physics, Chemistry, Biology, etc.)"
echo -e "  ${BLUE}•${NC} 10 test users (5 domain experts, 5 regular users)"
echo ""
echo -e "${RED}Press Ctrl+C to stop the demo${NC}"
echo ""

# Keep script running and show logs
echo -e "${YELLOW}Watching for activity...${NC}"
echo ""

# Wait indefinitely (servers run in background)
while true; do
    # Check if servers are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}Backend server stopped unexpectedly!${NC}"
        exit 1
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}Frontend server stopped unexpectedly!${NC}"
        exit 1
    fi
    sleep 5
done

