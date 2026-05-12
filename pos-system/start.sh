#!/bin/bash
export PATH="/tmp/node-install/bin:$PATH"
echo "Starting POS System..."
echo ""

# Start backend in background
node server/index.js &
SERVER_PID=$!

# Wait a moment then start frontend
sleep 1
cd client && npm run dev &
CLIENT_PID=$!

echo ""
echo "✅ POS System running:"
echo "   Frontend → http://localhost:5173"
echo "   Backend  → http://localhost:3001"
echo ""
echo "   Login: admin@pos.com / admin123"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait and handle Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0" INT
wait
