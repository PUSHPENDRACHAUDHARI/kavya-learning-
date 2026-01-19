## Multi-stage Dockerfile: build frontend with Node 20 then run backend
FROM node:20.19.0-bullseye AS builder
WORKDIR /app

# Build frontend
COPY frontend/package*.json ./frontend/
COPY frontend/ ./frontend/
WORKDIR /app/frontend
ENV NODE_OPTIONS="--max_old_space_size=2048"
RUN npm ci && npm run build

# Build backend (install production deps only)
WORKDIR /app
COPY backend/package*.json ./backend/
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

## Final image
FROM node:20.19.0-bullseye AS runtime
WORKDIR /app
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist
WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
