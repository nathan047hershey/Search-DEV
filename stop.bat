@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Search Dev GitHub - Stop
echo.
echo === Stopping Search Dev GitHub ===
echo.

for %%P in (3000 3001) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo Stopping PID %%A on port %%P ...
    taskkill /PID %%A /F >nul 2>&1
  )
)

if exist ".next\dev\lock" (
  del /f /q ".next\dev\lock" >nul 2>&1
  echo Cleared .next\dev\lock
)

echo.
echo Done. You can double-click run.bat again.
echo Tip: to free disk space, use clear-cache.bat (deletes .next only).
echo.
pause
