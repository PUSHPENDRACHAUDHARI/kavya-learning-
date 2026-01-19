@echo off
REM Moved startup script into backend\scripts
set ROOT_DIR=%~dp0\..

echo Starting KavyaLearn (moved script)

start "KavyaLearn Backend" cmd /k "cd /d "%ROOT_DIR%" && npm install --silent && npm run dev"
timeout /t 2 /nobreak

start "KavyaLearn Frontend" cmd /k "cd /d "%ROOT_DIR%..\Frontend-Kavya-Learn" && npm install --silent && npm run dev"
timeout /t 3 /nobreak

echo Startup invoked. Check backend\backend.log and frontend log files in frontend folder.
