@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Search Dev GitHub - Clear cache
echo.
echo === Clear .next build cache ===
echo.
echo This deletes compiled Next.js cache only.
echo Your source code, .env.local, and data\ database stay safe.
echo.

call stop.bat < nul 2>nul

if exist ".next" (
  echo Deleting .next ...
  rmdir /s /q ".next"
  if exist ".next" (
    echo [WARN] Could not fully delete .next - stop the app with stop.bat and try again.
  ) else (
    echo Done. .next cleared.
  )
) else (
  echo No .next folder found - already clean.
)

echo.
echo Next run.bat will recreate .next automatically.
echo.
pause
