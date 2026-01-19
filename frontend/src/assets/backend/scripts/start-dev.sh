#!/bin/bash
# Startup script moved into backend/scripts. Paths are relative to this script's location.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PATH="$PROJECT_ROOT"
FRONTEND_PATH="$PROJECT_ROOT/../Frontend-Kavya-Learn"
E2E_PATH="$FRONTEND_PATH/e2e"

echo "Starting KavyaLearn (moved script)"

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

if [ "$SKIP_BACKEND" = false ]; then
    echo "Starting Backend..."
    cd "$BACKEND_PATH"
    npm install --silent
    nohup node server.js > backend.log 2>&1 &
    sleep 2
fi

if [ "$SKIP_FRONTEND" = false ]; then
    echo "Starting Frontend..."
    cd "$FRONTEND_PATH"
    npm install --silent
    nohup npm run dev > frontend.log 2>&1 &
    sleep 3
fi

if [ "$RUN_TESTS" = true ]; then
    echo "Running tests..."
    cd "$E2E_PATH"
    npm install
    npx playwright install --with-deps
    npm test
fi

echo "Done"
