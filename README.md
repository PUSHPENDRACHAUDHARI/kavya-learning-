# KavyaLearn — root README

This repository contains a frontend (Vite/React) and backend (Express/MongoDB).

How to build & start locally (root):

- Build frontend and start backend:

```bash
npm start
```

This runs `start.sh`, which builds `frontend` and starts the backend server (`backend/server.js`).

Notes:
- `package.json` at project root sets `engines.node: >=20.19.0` and an `.nvmrc` file exists to request Node 20 for builds.
- `Procfile` contains `web: npm start` for platforms that use a Procfile.
- `start.sh` sets `NODE_OPTIONS` to increase Node heap during frontend build to mitigate Vite OOM errors.

Docker (recommended for deployments):

- Build and run the multi-stage Docker image (uses Node 20.19):

```bash
# from project root
docker build -t kavyalearn .
docker run -p 5000:5000 --env-file backend/.env kavyalearn
```

Security note: do not commit sensitive credentials to Git; use environment variables or the platform's secret management.
