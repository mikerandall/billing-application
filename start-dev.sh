#!/bin/bash

# Development startup script for Billing Application

echo "Starting Billing Application Development Environment..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "Warning: MongoDB doesn't appear to be running."
    echo "Please start MongoDB first: brew services start mongodb/brew/mongodb-community"
    echo ""
fi

# Start backend with visible logs
echo "Starting FastAPI backend..."
cd backend

echo ""
echo "🚀 Backend starting with logs visible below:"
echo "=============================================="

# Start backend in foreground but allow script to continue
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend quietly
echo ""
echo "Starting React frontend (logs suppressed)..."
cd ../frontend
npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "🚀 Development servers started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Backend logs will appear below. Press Ctrl+C to stop all servers"
echo "=============================================="

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
