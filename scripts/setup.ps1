# One-time setup after copying the project to a new machine.
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "==> Project: $root"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error "Node.js not found. Install Node 20+ from https://nodejs.org then re-run."
}

$ver = (node -v) -replace "^v", ""
Write-Host "==> Node $($ver)"

if (-not (Test-Path ".env.local")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env.local"
    Write-Host "==> Created .env.local from .env.example — edit it and add your API keys."
  } else {
    Write-Warning "No .env.example found. Create .env.local manually."
  }
} else {
  Write-Host "==> .env.local already exists (keeping it)."
}

Write-Host "==> npm install (may take a few minutes)..."
npm install

Write-Host ""
Write-Host "Done. Start the app with:"
Write-Host "  npm run dev"
Write-Host "Then open http://localhost:3000"
