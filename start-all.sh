#!/bin/bash

# MIVA University AI Assistant - Complete System Startup Script
# Starts both backend MCP services and frontend Next.js application

echo "🎓 MIVA University AI Assistant - Complete System Startup"
echo "==========================================================="

# Check if we're in the correct directory
if [ ! -d "mcp-server" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected structure: better-chatbot-main/"
    echo "   - mcp-server/"
    echo "   - frontend/"
    exit 1
fi

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo "   Stopping backend services..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "   Stopping frontend..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    # Kill any remaining processes on our ports
    lsof -ti:8080,8082,8083,3000 | xargs kill -9 2>/dev/null
    
    echo "✅ All services stopped!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "🚀 Starting backend services..."
cd mcp-server

# Start backend services using the main launcher
python3 main.py &
BACKEND_PID=$!

# Give backend time to start
sleep 5

echo ""
echo "🚀 Starting frontend application..."
cd ../frontend

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Give frontend time to start
sleep 3

echo ""
echo "🎯 All Services Started!"
echo "========================"
echo ""
echo "📊 Service Endpoints:"
echo "   🧠 MCP Server: http://localhost:8080"
echo "   ⚡ Content Processor API: http://localhost:8082"
echo "   🤖 Study Buddy API: http://localhost:8083"
echo "   🌐 Frontend Application: http://localhost:3000"
echo ""
echo "📖 API Documentation:"
echo "   📋 Content Processor: http://localhost:8082/docs"
echo "   📋 Study Buddy: http://localhost:8083/docs"
echo ""
echo "✨ System ready! Press Ctrl+C to stop all services."
echo ""

# Wait for processes and monitor them
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend services stopped unexpectedly!"
        cleanup
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend application stopped unexpectedly!"
        cleanup
    fi
    
    sleep 2
done