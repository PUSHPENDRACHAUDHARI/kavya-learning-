# KavyaLearn Quick Start Guide

## 🚀 Fastest Way to Run Everything

### Windows (PowerShell)

```powershell
cd C:\Users\VEDABYTE\Desktop\kavyalearn
.\start-dev.ps1
```

**With Tests:**
```powershell
.\start-dev.ps1 -RunTests
```

### Linux/Mac (Bash)

```bash
cd ~/Desktop/kavyalearn
chmod +x start-dev.sh
./start-dev.sh
```

**With Tests:**
```bash
./start-dev.sh --run-tests
```

---

## 📋 Manual Setup (If Script Doesn't Work)

### Terminal 1: Backend
```powershell
# Windows PowerShell
cd C:\Users\VEDABYTE\Desktop\kavyalearn\backend
npm install
node server.js
```

### Terminal 2: Frontend
```powershell
# Windows PowerShell
cd 'C:\Users\VEDABYTE\Desktop\kavyalearn\Frontend-Kavya-Learn 1\Frontend-Kavya-Learn'
npm install
npm run dev
```

### Terminal 3: Tests (Optional)
```powershell
# Windows PowerShell
cd C:\Users\VEDABYTE\Desktop\kavyalearn\e2e
npm install
npm test
```

---

## ✅ Verification

Open your browser:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api

---

## 🧪 Run Tests After Servers Start

```powershell
cd C:\Users\VEDABYTE\Desktop\kavyalearn\e2e
npm test
```

**Expected Result:** 21 tests passed ✓

---

## 🛑 Stop Everything

```powershell
# Windows: Close the terminal windows or:
Get-Job | Stop-Job
```

```bash
# Linux/Mac:
pkill -f "node server.js"
pkill -f "vite"
```

---

## 📊 What Just Happened?

✅ Backend API running on **http://127.0.0.1:5000**
✅ Frontend React app running on **http://127.0.0.1:5173**
✅ MongoDB connected at **mongodb://localhost:27017/kavyalearn**
✅ All data persisting to MongoDB
✅ Full E2E tests passing (21/21)

**You're done! 🎉**
