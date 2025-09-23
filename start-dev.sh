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

# Start both servers concurrently from the root directory
echo "🔧 Starting backend and frontend servers..."
npm run dev &
DEV_PID=$!

# Wait for the process
wait $DEV_PID
