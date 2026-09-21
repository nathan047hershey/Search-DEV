@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Search Dev GitHub - Share link
echo.
echo === Share this app to another PC ===
echo.
echo IMPORTANT:
echo   - Keep run.bat running (must say Ready).
echo   - Login/auth works best on localhost on THIS PC.
echo   - Share links are for opening the UI from another device.
echo.
echo If sharing fails, use the app only on this PC:
echo   http://localhost:3000
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)

echo Checking that localhost:3000 is up...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:3000 -TimeoutSec 5; if ($r.StatusCode -ge 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo.
  echo [ERROR] App is not running on http://localhost:3000
  echo 1. Double-click run.bat
  echo 2. Wait until it prints Ready
  echo 3. Then run share.bat again
  echo.
  pause
  exit /b 1
)

echo.
echo Starting tunnel (Cloudflare)...
echo Look for a line: https://xxxx.trycloudflare.com
echo Open that link on your other PC.
echo Press Ctrl+C to stop sharing.
echo.

call npx --yes cloudflared@latest tunnel --url http://127.0.0.1:3000
if errorlevel 1 (
  echo.
  echo Cloudflare tunnel failed. Trying localtunnel fallback...
  echo.
  call npx --yes localtunnel --port 3000
)

echo.
pause
