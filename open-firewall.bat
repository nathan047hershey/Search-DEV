@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Allow port 3000 (firewall)
echo.
echo === Open Windows Firewall for port 3000 ===
echo.
echo Run this ON THE PC WHERE THE APP IS RUNNING
echo (needs Administrator once).
echo.

net session >nul 2>&1
if errorlevel 1 (
  echo Please right-click this file and choose
  echo "Run as administrator", then try again.
  pause
  exit /b 1
)

netsh advfirewall firewall delete rule name="Search Dev GitHub 3000" >nul 2>&1
netsh advfirewall firewall add rule name="Search Dev GitHub 3000" dir=in action=allow protocol=TCP localport=3000 profile=any
if errorlevel 1 (
  echo [ERROR] Could not add firewall rule.
  pause
  exit /b 1
)

echo OK - inbound TCP 3000 is allowed.
echo.
echo On your other PC, open:
echo   http://THIS-PC-IP:3000
echo.
echo Use the Network URL shown in the run.bat window, for example:
echo   http://100.86.137.63:3000
echo (include http:// — do not use https)
echo.
pause
