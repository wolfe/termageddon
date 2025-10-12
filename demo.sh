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

# Step 5: Pre-authenticate test users
echo -e "${YELLOW}[5/7] Pre-authenticating test users...${NC}"

# Function to get auth token for a user
get_auth_token() {
    local username="$1"
    local password="$2"
    
    # Login via API and extract token
    local response=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$username\", \"password\": \"$password\"}")
    
    # Extract token using jq or sed (fallback)
    if command -v jq &> /dev/null; then
        echo "$response" | jq -r '.token'
    else
        # Fallback: extract token using sed
        echo "$response" | sed -n 's/.*"token": *"\([^"]*\)".*/\1/p'
    fi
}

# Get tokens for test users
echo -e "${BLUE}  → Getting auth tokens for test users...${NC}"
MARIA_TOKEN=$(get_auth_token "mariacarter" "mariacarter")
BEN_TOKEN=$(get_auth_token "bencarter" "bencarter")

if [ -z "$MARIA_TOKEN" ] || [ "$MARIA_TOKEN" = "null" ]; then
    echo -e "${RED}  ✗ Failed to get token for mariacarter${NC}"
    MARIA_TOKEN=""
fi

if [ -z "$BEN_TOKEN" ] || [ "$BEN_TOKEN" = "null" ]; then
    echo -e "${RED}  ✗ Failed to get token for bencarter${NC}"
    BEN_TOKEN=""
fi

if [ -n "$MARIA_TOKEN" ] && [ -n "$BEN_TOKEN" ]; then
    echo -e "${GREEN}  ✓ Successfully authenticated test users${NC}"
else
    echo -e "${YELLOW}  ⚠ Some users failed to authenticate - manual login required${NC}"
fi
echo ""

# Step 6: Open Chrome with both tabs
echo -e "${YELLOW}[6/7] Opening Chrome browser...${NC}"

# Check if Chrome is installed
if command -v open &> /dev/null && [ -d "/Applications/Google Chrome.app" ]; then
    # macOS - Open multiple windows for testing
    echo -e "${BLUE}  → Opening Chrome windows for testing...${NC}"
    
    # Window 1: Admin interface
    open -a "Google Chrome" "http://localhost:8000/admin/"
    sleep 2
    
    # Window 2: Frontend as Maria Carter (pre-authenticated if token available)
    if [ -n "$MARIA_TOKEN" ]; then
        MARIA_URL="http://localhost:4200?token=$MARIA_TOKEN&username=mariacarter"
        echo -e "${BLUE}  → Opening Maria Carter window (pre-authenticated)...${NC}"
    else
        MARIA_URL="http://localhost:4200"
        echo -e "${BLUE}  → Opening Maria Carter window (manual login required)...${NC}"
    fi
    open -a "Google Chrome" "$MARIA_URL"
    sleep 2
    
    # Window 3: Frontend as Ben Carter (pre-authenticated if token available)
    if [ -n "$BEN_TOKEN" ]; then
        BEN_URL="http://localhost:4200?token=$BEN_TOKEN&username=bencarter"
        echo -e "${BLUE}  → Opening Ben Carter window (pre-authenticated)...${NC}"
    else
        BEN_URL="http://localhost:4200"
        echo -e "${BLUE}  → Opening Ben Carter window (manual login required)...${NC}"
    fi
    open -a "Google Chrome" "$BEN_URL"
    
    echo -e "${GREEN}  ✓ Chrome opened with 3 windows:${NC}"
    echo -e "    ${BLUE}•${NC} Django Admin (admin/admin)"
    if [ -n "$MARIA_TOKEN" ]; then
        echo -e "    ${BLUE}•${NC} Frontend Window 1 (Maria Carter - ${GREEN}pre-authenticated${NC})"
    else
        echo -e "    ${BLUE}•${NC} Frontend Window 1 (login as mariacarter/mariacarter)"
    fi
    if [ -n "$BEN_TOKEN" ]; then
        echo -e "    ${BLUE}•${NC} Frontend Window 2 (Ben Carter - ${GREEN}pre-authenticated${NC})"
    else
        echo -e "    ${BLUE}•${NC} Frontend Window 2 (login as bencarter/bencarter)"
    fi
    
elif command -v google-chrome &> /dev/null; then
    # Linux with google-chrome
    google-chrome "http://localhost:8000/admin/" &
    sleep 2
    if [ -n "$MARIA_TOKEN" ]; then
        google-chrome "http://localhost:4200?token=$MARIA_TOKEN&username=mariacarter" &
    else
        google-chrome "http://localhost:4200" &
    fi
    sleep 2  
    if [ -n "$BEN_TOKEN" ]; then
        google-chrome "http://localhost:4200?token=$BEN_TOKEN&username=bencarter" &
    else
        google-chrome "http://localhost:4200" &
    fi
    echo -e "${GREEN}  ✓ Chrome opened with 3 windows${NC}"
elif command -v chromium-browser &> /dev/null; then
    # Linux with chromium
    chromium-browser "http://localhost:8000/admin/" &
    sleep 2
    if [ -n "$MARIA_TOKEN" ]; then
        chromium-browser "http://localhost:4200?token=$MARIA_TOKEN&username=mariacarter" &
    else
        chromium-browser "http://localhost:4200" &
    fi
    sleep 2
    if [ -n "$BEN_TOKEN" ]; then
        chromium-browser "http://localhost:4200?token=$BEN_TOKEN&username=bencarter" &
    else
        chromium-browser "http://localhost:4200" &
    fi
    echo -e "${GREEN}  ✓ Chromium opened with 3 windows${NC}"
else
    echo -e "${YELLOW}  ⚠ Chrome not found. Please open manually:${NC}"
    echo -e "    ${BLUE}http://localhost:8000/admin/${NC}"
    if [ -n "$MARIA_TOKEN" ]; then
        echo -e "    ${BLUE}http://localhost:4200?token=$MARIA_TOKEN&username=mariacarter${NC} (Maria Carter - pre-authenticated)"
    else
        echo -e "    ${BLUE}http://localhost:4200${NC} (Window 1 - login as mariacarter)"
    fi
    if [ -n "$BEN_TOKEN" ]; then
        echo -e "    ${BLUE}http://localhost:4200?token=$BEN_TOKEN&username=bencarter${NC} (Ben Carter - pre-authenticated)"
    else
        echo -e "    ${BLUE}http://localhost:4200${NC} (Window 2 - login as bencarter)"
    fi
fi
echo ""

# Step 7: Display summary
echo -e "${YELLOW}[7/7] Displaying summary...${NC}"
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
echo -e "  ${BLUE}•${NC} mariacarter     (Maria Carter) - ${GREEN}Perspective Curator: Physics, Chemistry${NC}"
echo -e "  ${BLUE}•${NC} bencarter       (Ben Carter) - ${GREEN}Perspective Curator: Chemistry, Biology${NC}"
echo -e "  ${BLUE}•${NC} sofiarossi      (Sofia Rossi) - ${GREEN}Perspective Curator: Computer Science, Graph Theory${NC}"
echo -e "  ${BLUE}•${NC} leoschmidt      (Leo Schmidt) - ${GREEN}Perspective Curator: Biology, Geology${NC}"
echo -e "  ${BLUE}•${NC} kenjitanaka     (Kenji Tanaka) - ${GREEN}Perspective Curator: Physics, Geology${NC}"
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
echo -e "  ${BLUE}•${NC} 9 perspectives (Physics, Chemistry, Biology, etc.)"
echo -e "  ${BLUE}•${NC} 10 test users (5 perspective curators, 5 regular users)"
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

