#!/bin/bash

# Kill any existing processes on ports 4000 and 8000
echo "🧹 Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Wait a moment for ports to be freed
sleep 2

echo "🚀 Starting Ge-Metrics development servers..."
echo "📊 Backend: http://localhost:4000"
echo "🌐 Frontend: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start backend server in background
echo "🔧 Starting backend server..."
(cd server && npm run dev:full) &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server in background
echo "⚛️ Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait
