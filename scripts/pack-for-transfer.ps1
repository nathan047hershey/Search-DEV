# Pack this project for another PC (excludes node_modules / .next).
# Always includes data/ (SQLite DB + JSON history/templates) unless -SkipData.
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\pack-for-transfer.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\pack-for-transfer.ps1 -SkipEnv
#   powershell -ExecutionPolicy Bypass -File .\scripts\pack-for-transfer.ps1 -OutPath "$env:USERPROFILE\Desktop\search-dev.zip"

param(
  [string]$OutPath = "",
  [switch]$SkipEnv,
  [switch]$SkipData
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
if (-not $OutPath) {
  $OutPath = Join-Path $env:USERPROFILE "Desktop\search-dev-github-$stamp.zip"
}

$stage = Join-Path $env:TEMP "search-dev-pack-$stamp"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

Write-Host "Staging from $root ..."

$excludeDirs = @("node_modules", ".next", ".git", ".turbo", "out")
Get-ChildItem -Path $root -Force | ForEach-Object {
  $name = $_.Name
  if ($excludeDirs -contains $name) {
    Write-Host "  skip dir  $name"
    return
  }
  if ($name -eq "data" -and $SkipData) {
    Write-Host "  skip dir  data (-SkipData)"
    return
  }
  if ($name -eq ".env.local" -and $SkipEnv) {
    Write-Host "  skip file .env.local (-SkipEnv)"
    return
  }
  if ($name -match '^\.env\..*\.local$') {
    if ($SkipEnv) { return }
  }
  Copy-Item $_.FullName -Destination (Join-Path $stage $name) -Recurse -Force
}

# Never pack nested env under src/
$nestedEnv = Join-Path $stage "src\.env.local"
if (Test-Path $nestedEnv) {
  Remove-Item $nestedEnv -Force
  Write-Host "  removed staged src\.env.local"
}

# Re-copy data/ explicitly so SQLite + JSON are never missed
$dataSrc = Join-Path $root "data"
$dataDst = Join-Path $stage "data"
if (-not $SkipData -and (Test-Path $dataSrc)) {
  if (Test-Path $dataDst) { Remove-Item $dataDst -Recurse -Force }
  New-Item -ItemType Directory -Path $dataDst | Out-Null

  $dbFiles = @(
    "app.db",
    "app.db-wal",
    "app.db-shm",
    "contacts.json",
    "sent-history.json",
    "send-limits.json",
    "templates.json",
    "app.json"
  )

  Write-Host "  packing database / data files:"
  foreach ($f in $dbFiles) {
    $src = Join-Path $dataSrc $f
    if (Test-Path $src) {
      Copy-Item $src -Destination (Join-Path $dataDst $f) -Force
      $len = (Get-Item $src).Length
      Write-Host ("    + {0} ({1:N0} bytes)" -f $f, $len)
    }
  }

  # Also copy any other files sitting in data/
  Get-ChildItem $dataSrc -File | ForEach-Object {
    $dest = Join-Path $dataDst $_.Name
    if (-not (Test-Path $dest)) {
      Copy-Item $_.FullName -Destination $dest -Force
      Write-Host ("    + {0} ({1:N0} bytes)" -f $_.Name, $_.Length)
    }
  }
}

$stagedDb = Join-Path $dataDst "app.db"
if (-not $SkipData) {
  if (-not (Test-Path $stagedDb)) {
    Write-Warning "data/app.db was not found. Zip will not include the SQLite database."
  } else {
    Write-Host ("  OK database staged: {0:N0} bytes" -f (Get-Item $stagedDb).Length)
  }
}

if (Test-Path $OutPath) { Remove-Item $OutPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $OutPath)
Remove-Item $stage -Recurse -Force

# Verify zip contains the database
$zip = [System.IO.Compression.ZipFile]::OpenRead($OutPath)
$dbEntries = @($zip.Entries | Where-Object { $_.FullName -match '(?i)(^|[/\\])data[/\\]app\.db$' })
$dataCount = @($zip.Entries | Where-Object { $_.FullName -match '(?i)(^|[/\\])data[/\\]' }).Count
$zip.Dispose()

Write-Host ""
Write-Host "Created: $OutPath"
Write-Host ("Zip size: {0:N1} KB" -f ((Get-Item $OutPath).Length / 1KB))
Write-Host ("Data files in zip: {0}" -f $dataCount)
if ($dbEntries.Count -gt 0) {
  Write-Host ("Includes database: data/app.db ({0:N0} bytes)" -f $dbEntries[0].Length)
} elseif (-not $SkipData) {
  Write-Warning "ZIP IS MISSING data/app.db"
}

if (-not $SkipEnv) {
  Write-Host "Includes .env.local - keep this zip private (USB or encrypted drive only)."
} else {
  Write-Host "Skipped .env.local - copy secrets separately onto the other PC."
}

Write-Host ""
Write-Host "On the other PC:"
Write-Host "  1. Unzip"
Write-Host "  2. Read START_HERE.txt"
Write-Host "  3. Double-click setup.bat (first time)"
Write-Host "  4. Double-click run.bat"
Write-Host "  5. Open http://localhost:3000"
