# KavyaLearn - Full Stack Web Application

A comprehensive learning management system built with **React** (frontend), **Node.js/Express** (backend), and **MongoDB** (database). Fully integrated with E2E testing using Playwright.

---

## 📋 Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Running Tests](#running-tests)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## 📁 Project Structure

```
kavyalearn/
├── backend/                          # Node.js + Express server
│   ├── config/                       # Database & config
│   ├── controllers/                  # Route handlers
│   ├── models/                       # MongoDB schemas
│   ├── middleware/                   # Auth & authorization
│   ├── routes/                       # API endpoints
│   ├── package.json
│   ├── server.js                     # Entry point
│   └── .env                          # Environment variables
│
├── Frontend-Kavya-Learn/             # React Vite frontend
│   ├── src/
│   │   ├── api/                      # API helper functions
│   │   ├── components/               # React components
│   │   ├── pages/                    # Page components (Login, Dashboard, etc.)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── e2e/                              # Playwright E2E tests
│   ├── tests/
│   │   ├── integration.spec.js       # Full-stack integration tests (12 tests)
│   │   └── e2e.spec.js               # UI workflow tests (1 test)
│   ├── playwright.config.js
│   ├── package.json
│   └── test-results/                 # Test reports
│
└── README.md                         # This file
```

---

## 🔧 Prerequisites

Ensure the following are installed:

- **Node.js** (v18+): [Download](https://nodejs.org/)
- **MongoDB** (v5+): [Download](https://www.mongodb.com/try/download/community)
- **Git** (optional, for version control)

### Verify Installation

```powershell
node --version
npm --version
mongod --version
```

---

## 🚀 Quick Start (Fastest Way)

### Option A: Using PowerShell Script (Recommended)

```powershell
# Navigate to project root
cd C:\Users\VEDABYTE\Desktop\kavyalearn

# Run the startup script
.\start-dev.ps1

# Or with tests:
.\start-dev.ps1 -RunTests

# Custom options:
.\start-dev.ps1 -SkipFrontend -RunTests  # Start backend only + run tests
.\start-dev.ps1 -SkipBackend             # Start frontend only
```

### Option B: Manual Startup (All 3 Commands in Separate Terminals)

**Terminal 1 - Backend:**
```powershell
cd C:\Users\VEDABYTE\Desktop\kavyalearn\backend
npm install
node server.js
```

**Terminal 2 - Frontend:**
```powershell
cd 'C:\Users\VEDABYTE\Desktop\kavyalearn\Frontend-Kavya-Learn 1\Frontend-Kavya-Learn'
npm install
npm run dev
```

**Terminal 3 - Tests (optional):**
```powershell
cd C:\Users\VEDABYTE\Desktop\kavyalearn\e2e
npm install
npm test
```

---

## 📖 Detailed Setup

### 1. Start MongoDB

**Option A: Windows Service (if installed)**
```powershell
# MongoDB should start automatically or:
Start-Service MongoDB
```

**Option B: Manual MongoDB**
```powershell
mongod --dbpath "C:\path\to\data\db"
```

Verify:
```powershell
mongosh  # If installed, or use MongoDB Compass GUI
```

---

### 2. Backend Setup & Run

```powershell
cd C:\Users\VEDABYTE\Desktop\kavyalearn\backend

# Install dependencies
npm install

# Start server
node server.js
```

**Expected Output:**
```
[dotenv] injecting env (3) from .env
🚀 Server running on port 5000
👉 API Documentation: http://localhost:5000/api-docs
📝 MongoDB URI: mongodb://localhost:27017/kavyalearn
✅ MongoDB Connected: localhost
```

**Environment Variables** (`.env` file, should already exist):
```env
MONGO_URI=mongodb://localhost:27017/kavyalearn
JWT_SECRET=your-secret-key-here
PORT=5000
```

---

### 3. Frontend Setup & Run

```powershell
cd 'C:\Users\VEDABYTE\Desktop\kavyalearn\Frontend-Kavya-Learn 1\Frontend-Kavya-Learn'

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

**Expected Output:**
```
VITE v7.1.12 ready in 1004 ms
➜  Local:   http://localhost:5173/
➜  Network: http://10.26.30.118:5173/
```

**Access the Frontend:**
- Open http://localhost:5173 or http://127.0.0.1:5173 in your browser

---

### 4. Verify Everything is Running

```powershell
# Check backend
Invoke-WebRequest -Uri http://127.0.0.1:5000/api/courses -UseBasicParsing | Select-Object StatusCode

# Check frontend
Invoke-WebRequest -Uri http://127.0.0.1:5173 -UseBasicParsing | Select-Object StatusCode
```

Both should return **Status Code: 200**.

---

## 🧪 Running Tests

### Run All E2E Tests (Playwright)

```powershell
cd C:\Users\VEDABYTE\Desktop\kavyalearn\e2e

# Install test dependencies (one time)
npm install
npx playwright install --with-deps

# Run all tests
npm test
```

### Test Results

The test suite includes **21 tests**:
- **8 Backend API Integration Tests** (register, create course, create quiz, list quizzes, create event, list events, user profile, data persistence)
- **1 UI Workflow Test** (register → create course → create quiz → attempt quiz)
- **12 Full Stack Integration Tests** (API tests + frontend login, schedule, profile, data persistence)

**Expected Output:**
```
Running 21 tests using 1 worker

✓ 1. Register instructor via API
✓ 2. Create course via API
✓ 3. Create quiz via API
✓ 4. List quizzes for course
✓ 5. Create event via API
✓ 6. List events via API
✓ 7. Get user profile
✓ 8. Verify data persistence in MongoDB
✓ 9. Register → create course → create quiz via UI
✓ 10. Register instructor via backend API
... (12 more tests)

21 passed (21.1s)
```

### View Test Reports

```powershell
# HTML report
start C:\Users\VEDABYTE\Desktop\kavyalearn\e2e\playwright-report\index.html
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — User login
- `GET /api/auth/profile` — Get authenticated user profile

### Courses
- `GET /api/courses` — List all courses
- `POST /api/courses` — Create course (instructor only)
- `GET /api/courses/:id` — Get course details
- `PUT /api/courses/:id` — Update course
- `DELETE /api/courses/:id` — Delete course

### Quizzes
- `GET /api/quiz?courseId=:courseId` — List quizzes for a course
- `POST /api/quiz` — Create quiz (instructor only)
- `GET /api/quiz/:id` — Get quiz details
- `POST /api/quiz/:id/submit` — Submit quiz answers and get score
- `PUT /api/quiz/:id` — Update quiz
- `DELETE /api/quiz/:id` — Delete quiz

### Events
- `GET /api/events` — List all events
- `POST /api/events` — Create event (instructor only)
- `PUT /api/events/:id` — Update event
- `DELETE /api/events/:id` — Delete event

### Lessons, Assignments, Payments, AI Tutor
- Full CRUD endpoints available at `/api/lessons`, `/api/assignments`, `/api/payments`, `/api/ai`

---

## 🎯 Frontend Features

### Pages Implemented
- **Login** (`/login`) — User authentication
- **Registration** (`/registration`) — New user signup
- **Dashboard** (`/dashboard`) — Main home page
- **Courses** (`/courses`) — Course listing and creation
- **Quizzes** (`/quizzes`) — Quiz management and attempts
- **Schedule** (`/schedule`) — Events and schedule management
- **Profile** (`/profile`) — User profile and settings
- **Leaderboard** (`/leaderboard`) — User rankings

### API Integration
All frontend pages are wired to backend APIs via the `src/api/index.js` helper module:
```javascript
// Example usage in React components
import { getCourses, createQuiz, submitQuiz } from '../api/index.js';

const courses = await getCourses();
const response = await submitQuiz(quizId, answers);
```

---

## 🔐 Authentication Flow

1. User registers or logs in
2. Backend returns JWT token
3. Token stored in `localStorage` with key `token`
4. All API requests include `Authorization: Bearer {token}` header
5. Backend middleware (`authMiddleware.js`) validates token on protected routes

### User Roles
- **student** — Can take quizzes, enroll in courses
- **instructor** — Can create courses, quizzes, events
- **admin** — Full system access

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED ::1:27017
```
**Solution:**
- Ensure MongoDB is running: `mongod --dbpath "C:\data\db"`
- Verify MongoDB URI in `.env` matches your MongoDB server

### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution:**
```powershell
# Find process using port 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess | 
  ForEach-Object { Stop-Process -Id $_ -Force }
```

### Frontend Not Accessible
```
Error: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173
```
**Solution:**
- Check that frontend is running: `Get-Process | Where-Object ProcessName -eq 'node'`
- Try accessing http://localhost:5173 or http://10.26.30.118:5173
- Restart frontend with: `npm run dev`

### Playwright Tests Timeout
```
Test timeout exceeded
```
**Solution:**
- Ensure both backend and frontend are running
- Increase test timeout in `playwright.config.js`:
  ```javascript
  timeout: 120 * 1000  // 120 seconds
  ```
- Run tests with more verbosity: `npm test -- --debug`

### JWT Token Errors
```
Error: Invalid token / Token expired
```
**Solution:**
- Clear browser localStorage and re-login
- Check JWT_SECRET in backend `.env` hasn't changed
- Verify token format: `Bearer <token>` in Authorization header

---

## 📚 Development Tips

### Debug Backend
```powershell
# Run with verbose logging
$env:DEBUG='*'
node server.js
```

### Debug Frontend
```powershell
# Open browser DevTools (F12) and check Console/Network tabs
# Enable verbose Vite logging:
npm run dev -- --debug
```

### Clean Database
```powershell
# Connect to MongoDB and clear collections
mongosh
use kavyalearn
db.dropDatabase()
exit
```

### View MongoDB Data
```powershell
# Use MongoDB Compass GUI: mongodb+srv://localhost:27017
# Or via CLI:
mongosh
use kavyalearn
db.users.find()
db.courses.find()
db.quizzes.find()
```

---

## 📦 Key Dependencies

**Backend:**
- Express (web framework)
- Mongoose (MongoDB ODM)
- JWT (authentication)
- CORS (cross-origin requests)

**Frontend:**
- React 19 (UI framework)
- Vite (build tool)
- React Router v7 (routing)
- Bootstrap 5 (styling)
- TailwindCSS (utility CSS)

**Testing:**
- Playwright (E2E testing)
- Node Fetch (API testing)

---

## 📞 Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review test logs: `e2e/test-results/`
3. Check backend logs: Terminal running `node server.js`
4. Review Playwright reports: `e2e/playwright-report/index.html`

---

## ✅ Verification Checklist

- [ ] MongoDB is running
- [ ] Backend starts on port 5000 with "MongoDB Connected" message
- [ ] Frontend starts on port 5173 with "VITE v7.x ready"
- [ ] `http://127.0.0.1:5173` loads in browser
- [ ] Can register and login via frontend
- [ ] Playwright tests pass (21/21)
- [ ] Can create courses, quizzes, and events
- [ ] Data persists in MongoDB after refresh

---

## 🎉 You're All Set!

Your KavyaLearn full stack is now running locally with:
- ✅ Backend API on port 5000
- ✅ Frontend on port 5173
- ✅ MongoDB local instance
- ✅ 21 passing E2E tests
- ✅ Full data persistence

**Happy coding! 🚀**
