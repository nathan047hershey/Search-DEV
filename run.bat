@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Search Dev GitHub
echo.
echo === Search Dev GitHub ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo.
  echo 1. Download Node.js 20 LTS: https://nodejs.org
  echo 2. Install it, then close and reopen this window.
  echo 3. Double-click setup.bat once, then run.bat.
  echo.
  start "" "https://nodejs.org"
  pause
  exit /b 1
)

for /f "tokens=1 delims=v." %%A in ('node -v 2^>nul') do set NODE_MAJOR=%%A
REM node -v prints v20.x.x — strip handled below
for /f "tokens=1 delims=." %%A in ('node -v 2^>nul') do set NODE_VER=%%A
set NODE_VER=%NODE_VER:v=%
if defined NODE_VER if %NODE_VER% LSS 20 (
  echo [WARN] Node %NODE_VER% detected. Node 20+ is recommended.
  echo Download LTS from https://nodejs.org if install fails.
  echo.
)

if not exist "package.json" (
  echo [ERROR] package.json not found.
  echo Unzip the full folder, then run this bat from inside it.
  pause
  exit /b 1
)

if not exist ".env.local" (
  if exist ".env.example" (
    echo Creating .env.local from .env.example ...
    copy /Y ".env.example" ".env.local" >nul
    echo.
    echo [IMPORTANT] Add your API keys in Notepad, save, then run.bat again.
    echo.
    notepad ".env.local"
    pause
    exit /b 0
  ) else (
    echo [ERROR] Missing .env.local and .env.example
    pause
    exit /b 1
  )
)

if not exist "node_modules\" (
  echo First launch on this PC - installing dependencies...
  echo This can take several minutes. Keep this window open.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    echo If better-sqlite3 failed: install "Desktop development with C++"
    echo from Visual Studio Build Tools, then run setup.bat again.
    pause
    exit /b 1
  )
  echo.
)

if not exist "data\" mkdir "data" >nul 2>&1

call :stop_existing

echo Starting app
echo   On THIS PC:  http://localhost:3000
echo   From another PC: keep this window open, then run share.bat
echo Press Ctrl+C to stop.  Or use stop.bat.
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
call npm run dev

echo.
pause
exit /b 0

:stop_existing
echo Checking for an already-running server...
for %%P in (3000 3001) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo   Stopping process on port %%P ^(PID %%A^)...
    taskkill /PID %%A /F >nul 2>&1
  )
)
if exist ".next\dev\lock" (
  del /f /q ".next\dev\lock" >nul 2>&1
  echo   Cleared .next\dev\lock
)
timeout /t 1 /nobreak >nul
echo.
goto :eof
