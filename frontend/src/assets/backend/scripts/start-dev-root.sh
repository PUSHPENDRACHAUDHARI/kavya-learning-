#!/bin/bash
# KavyaLearn Full Stack Development Server Startup Script (Linux/Mac)
# This script starts MongoDB (if needed), backend, and frontend servers in parallel

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PATH="$PROJECT_ROOT/backend"
FRONTEND_PATH="$PROJECT_ROOT/Frontend-Kavya-Learn 1/Frontend-Kavya-Learn"
E2E_PATH="$PROJECT_ROOT/e2e"

echo -e "${CYAN}🚀 Starting KavyaLearn Full Stack...${NC}"

# Parse arguments
SKIP_FRONTEND=false
SKIP_BACKEND=false
RUN_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-frontend) SKIP_FRONTEND=true; shift ;;
        --skip-backend) SKIP_BACKEND=true; shift ;;
        --run-tests) RUN_TESTS=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Check MongoDB
echo -e "${YELLOW}📊 Checking MongoDB...${NC}"
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
elif command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB not running. Start with: mongod${NC}"
else
    echo -e "${RED}❌ MongoDB not installed${NC}"
fi

# Start Backend
if [ "$SKIP_BACKEND" = false ]; then
    echo -e "\n${YELLOW}🔧 Starting Backend Server...${NC}"
    cd "$BACKEND_PATH"
    npm install --silent > /dev/null 2>&1
    nohup node server.js > backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    echo -e "${CYAN}  URL: http://127.0.0.1:5000/api${NC}"
    sleep 2
fi

# Start Frontend
if [ "$SKIP_FRONTEND" = false ]; then
    echo -e "\n${YELLOW}🎨 Starting Frontend Server (Vite)...${NC}"
    cd "$FRONTEND_PATH"
    npm install --silent > /dev/null 2>&1
    nohup npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    echo -e "${CYAN}  URL: http://127.0.0.1:5173${NC}"
    sleep 3
fi

# Display status
echo -e "\n${CYAN}📡 Server Status:${NC}"
echo -e "  ${GREEN}Backend:  http://127.0.0.1:5000/api${NC}"
echo -e "  ${GREEN}Frontend: http://127.0.0.1:5173${NC}"
echo -e "  ${GREEN}MongoDB:  mongodb://localhost:27017/kavyalearn${NC}"

# Run tests if requested
if [ "$RUN_TESTS" = true ]; then
    echo -e "\n${YELLOW}🧪 Running Playwright E2E Tests...${NC}"
    cd "$E2E_PATH"
    npm install > /dev/null 2>&1
    npx playwright install > /dev/null 2>&1
    npm test
fi

echo -e "\n${GREEN}✅ Full Stack is Ready!${NC}"
echo -e "\n${CYAN}Useful commands:${NC}"
echo -e "  View backend logs:  tail -f $BACKEND_PATH/backend.log"
echo -e "  View frontend logs: tail -f $FRONTEND_PATH/frontend.log"
echo -e "  Run tests:          cd $E2E_PATH && npm test"
echo -e "  Stop all:           pkill -f 'node server.js' && pkill -f 'vite'"

# Keep script running if servers started
if [ "$SKIP_BACKEND" = false ] || [ "$SKIP_FRONTEND" = false ]; then
    wait
fi
