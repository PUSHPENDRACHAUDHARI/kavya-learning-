@echo off
REM KavyaLearn Full Stack Startup Script (Batch/CMD)
REM Starts backend and frontend from the repository root directory.

echo.
echo ========================================
echo KavyaLearn Full Stack Startup
echo ========================================
echo.

REM Resolve script directory and use it as project root
set ROOT_DIR=%~dp0

REM Check MongoDB
echo Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MongoDB is running
) else (
    echo [WARNING] MongoDB not detected - ensure it's running separately
)

REM Start Backend (uses project's backend folder)
echo.
echo Starting Backend Server...
start "KavyaLearn Backend" cmd /k "cd /d "%ROOT_DIR%backend" && npm install --silent && npm run dev"
timeout /t 2 /nobreak

REM Start Frontend (uses project's Frontend-Kavya-Learn folder)
echo.
echo Starting Frontend Server...
start "KavyaLearn Frontend" cmd /k "cd /d "%ROOT_DIR%Frontend-Kavya-Learn" && npm install --silent && npm run dev"
timeout /t 3 /nobreak

echo.
echo ========================================
echo STARTUP COMPLETE!
echo ========================================
echo.
echo Backend:  http://127.0.0.1:5000/
echo Frontend: http://127.0.0.1:5173
echo MongoDB:  mongodb://localhost:27017/kavyalearn
echo.
echo Two new windows should open for backend and frontend output.
echo.
pause
