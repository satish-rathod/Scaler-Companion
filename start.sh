#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo "Shutting down..."
    # Kill all child processes of this script's process group
    kill $(jobs -p) 2>/dev/null
}
trap cleanup EXIT

# Start Backend
echo "Starting Backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend running on PID $BACKEND_PID"
cd ..

# Start Frontend
echo "Starting Dashboard..."
cd dashboard
npm run dev -- --host > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend running on PID $FRONTEND_PID"
cd ..

# Wait
echo "Services started. Press Ctrl+C to stop."
wait
