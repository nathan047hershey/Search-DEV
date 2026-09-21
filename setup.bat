@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Search Dev GitHub - Setup
echo.
echo === Setup for this PC ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo Install Node 20 LTS from https://nodejs.org then run setup.bat again.
  start "" "https://nodejs.org"
  pause
  exit /b 1
)

echo Node version:
node -v
echo npm version:
call npm -v
echo.

if not exist "data\" mkdir "data" >nul 2>&1

if not exist ".env.local" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env.local" >nul
    echo Created .env.local from .env.example
    echo Edit it if keys are missing.
  ) else (
    echo [WARN] No .env.example found.
  )
) else (
  echo .env.local found - keeping your keys.
)

echo.
echo Installing dependencies (npm install^)...
echo First time can take several minutes.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed.
  echo Common fix on Windows: install Visual Studio Build Tools
  echo with "Desktop development with C++", then run setup.bat again.
  pause
  exit /b 1
)

echo.
echo Setup complete for this PC.
echo.
echo Next: double-click run.bat
echo Then use http://localhost:3000
echo.
pause
