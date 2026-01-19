#!/usr/bin/env bash
set -euo pipefail

# Root start script for Railpack / simple deployments
# - Build frontend
# - Start backend
# Adjust or extend as needed for environment variables and production setup

echo "➡ Building frontend..."
cd frontend
if [ -f package-lock.json ] || [ -f yarn.lock ]; then
  npm ci
else
  npm install
fi
# Increase Node heap for builds (helps avoid JS heap OOM during Vite build)
export NODE_OPTIONS="${NODE_OPTIONS:-"--max_old_space_size=1536"}"
echo "➡ NODE_OPTIONS=${NODE_OPTIONS}"
npm run build

echo "➡ Starting backend..."
cd ../backend
if [ -f package-lock.json ] || [ -f yarn.lock ]; then
  npm ci
else
  npm install
fi

# Use npm start (backend has "start": "node server.js")
npm start
