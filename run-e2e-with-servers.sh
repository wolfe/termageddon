#!/bin/bash

# Simple script to start servers and run E2E tests
# This addresses the issue where the frontend server isn't running during E2E tests

echo "🚀 Starting servers for E2E tests..."

# Start backend server
echo "📊 Starting backend server..."
cd backend
source venv/bin/activate
python manage.py migrate --noinput
python manage.py load_test_data
python manage.py runserver > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ../frontend

# Wait for backend to start
sleep 5

# Start frontend server
echo "🌐 Starting frontend server..."
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for servers to start..."
sleep 15

# Check if both servers are running
if curl -s http://localhost:8000/api/ >/dev/null 2>&1 && curl -s http://localhost:4200 >/dev/null 2>&1; then
    echo "✅ Both servers are running"
    
    # Run E2E tests
    echo "🧪 Running E2E tests..."
    npx playwright test --reporter=line
    
    TEST_EXIT_CODE=$?
    
    # Clean up servers
    echo "🧹 Cleaning up servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    
    exit $TEST_EXIT_CODE
else
    echo "❌ Failed to start servers"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi
