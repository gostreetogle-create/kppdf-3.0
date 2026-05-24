<#
.SYNOPSIS
  KPPDF 3.0 - One-command launcher for Windows
.DESCRIPTION
  1. Kills processes on specified ports (default: 3000 backend, 4200 frontend)
  2. Optionally starts Docker MongoDB (skip with -SkipDocker)
  3. Starts backend (Express + MongoDB) in background
  4. Starts frontend (Angular) in a separate terminal window
  5. Opens browser at http://localhost:4200

  Режимы работы с MongoDB:
    -SkipDocker (no arg)    -> MongoMemoryServer (built-in, no Docker needed)
    without -SkipDocker      -> MongoDB in Docker + tsx watch
.PARAMETER Ports
  Ports to free. Default: @(3000, 4200).
.PARAMETER SkipDocker
  If set, skip Docker. Use MongoMemoryServer (built-in in-memory MongoDB).
  Default: Docker starts (MongoDB in container).
.EXAMPLE
  .\start.ps1
  Launch with Docker MongoDB + cleanup ports 3000 and 4200.

  .\start.ps1 -SkipDocker
  Launch with MongoMemoryServer (no Docker).

  .\start.ps1 -Ports @(3000, 4200, 9229) -SkipDocker
  Clean three ports + MongoMemoryServer.
#>

param(
  [int[]]$Ports = @(3000, 4200),
  [switch]$SkipDocker
)

# IMPORTANT: Do NOT set $ErrorActionPreference = 'Stop'
# It breaks Write-Host after 2>&1 redirection in PowerShell 5.1
$ErrorActionPreference = 'Continue'

# ──────────────────────────────────────────────────────────────
# Helper: ensure npm dependencies are installed
# ──────────────────────────────────────────────────────────────
function Ensure-Dependencies {
  param([string]$Dir, [string]$Label)

  $nodeModules = Join-Path $Dir "node_modules"
  $pkgLock = Join-Path $Dir "package-lock.json"

  if (-not (Test-Path $nodeModules)) {
    Write-Host "  >> ${Label}: node_modules not found. Running npm install..." -ForegroundColor Yellow
    Push-Location $Dir
    try {
      $null = npm install --legacy-peer-deps 2> $null
      if ($LASTEXITCODE -ne 0) {
        Write-Host "     npm install failed for ${Label}. Trying without --legacy-peer-deps..." -ForegroundColor Yellow
        $null = npm install 2> $null
      }
      if ($LASTEXITCODE -eq 0) {
        Write-Host "     ${Label} dependencies installed." -ForegroundColor Green
      } else {
        Write-Host "     WARNING: npm install for ${Label} had issues." -ForegroundColor Red
      }
    } finally {
      Pop-Location
    }
  } else {
    Write-Host "  >> ${Label}: node_modules found." -ForegroundColor Green
  }
}

# ──────────────────────────────────────────────────────────────
# Helper: kill process on a port
# ──────────────────────────────────────────────────────────────
function Stop-ProcessesOnPort {
  param([int]$Port)

  Write-Host "  >> Checking port $Port..."

  $pids = @()

  # Method 1: Get-NetTCPConnection (native PS, may need admin)
  try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
      $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    }
  } catch {
    # fall through
  }

  # Method 2: netstat (works without admin)
  if ($pids.Count -eq 0) {
    $netstat = netstat -ano | Select-String ":$Port"
    if ($netstat) {
      $pids = $netstat | ForEach-Object {
        ($_.ToString() -split '\s+')[-1]
      } | Where-Object { $_ -match '^\d+$' } | ForEach-Object { [int]$_ } | Select-Object -Unique
    }
  }

  if ($pids.Count -eq 0) {
    Write-Host "     Port $Port is free." -ForegroundColor Green
    return
  }

  foreach ($procId in $pids) {
    if ($procId -eq $PID) { continue }
    try {
      $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "     Stopping $($proc.ProcessName) (PID $procId) on port $Port..." -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "     PID $procId stopped." -ForegroundColor Green
        Start-Sleep -Milliseconds 300
      }
    } catch {
      Write-Host "     Could not stop PID ${procId}: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

# ──────────────────────────────────────────────────────────────
# Helper: wait for HTTP endpoint to respond 200
# ──────────────────────────────────────────────────────────────
function Wait-ForEndpoint {
  param(
    [string]$Url,
    [string]$Label,
    [int]$TimeoutSeconds = 60
  )

  Write-Host "     Waiting for $Label at $Url ..." -NoNewline
  $elapsed = 0
  while ($elapsed -lt $TimeoutSeconds) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      if ($r.StatusCode -eq 200) {
        Write-Host " ready!" -ForegroundColor Green
        return $true
      }
    } catch {
      # not ready yet
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "." -NoNewline
  }
  Write-Host " timeout ($TimeoutSeconds s)" -ForegroundColor Red
  return $false
}

# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────
$root = $PSScriptRoot
$backendDir = Join-Path $root 'backend'

Write-Host ""
Write-Host "========== KPPDF 3.0 - Local Launcher ==========" -ForegroundColor Cyan
Write-Host ""

# ── Step 0: Check dependencies ──
Write-Host "[0/5] Checking dependencies..." -ForegroundColor Gray
Ensure-Dependencies -Dir $root -Label "Frontend"
Ensure-Dependencies -Dir $backendDir -Label "Backend"
Write-Host "  Done." -ForegroundColor Green
Write-Host ""

# ── Step 1: Free ports ──
Write-Host "[1/5] Freeing ports..." -ForegroundColor Gray
foreach ($port in $Ports) {
  Stop-ProcessesOnPort -Port $port
}
Write-Host "  Done." -ForegroundColor Green
Write-Host ""

# ── Step 2: Database ──
Write-Host "[2/5] Database..." -ForegroundColor Gray

$useMemoryServer = $false

if (-not $SkipDocker) {
  Write-Host "  >> Starting MongoDB in Docker..."
  Push-Location $root

  # Run docker, check $? instead of 2>&1 to avoid PS5.1 stream bugs
  $null = docker compose up -d 2> $null
  if ($?) {
    Write-Host "     MongoDB container is up on port 27017." -ForegroundColor Green
    $useMemoryServer = $false
  } else {
    Write-Host "     Docker not available. Falling back to MongoMemoryServer." -ForegroundColor Yellow
    $useMemoryServer = $true
  }
  Pop-Location
} else {
  Write-Host "  >> Skipping Docker. Using MongoMemoryServer (in-memory)." -ForegroundColor Yellow
  $useMemoryServer = $true
}

if (-not $useMemoryServer) {
  # Seed data into Docker MongoDB
  Write-Host "  >> Seeding database..."
  Push-Location $backendDir
  $null = npm run seed 2> $null
  if ($?) {
    Write-Host "     Seed complete." -ForegroundColor Green
  } else {
    Write-Host "     Seed skipped or already seeded." -ForegroundColor Yellow
  }
  Pop-Location
  $backendLabel = "Express (Docker MongoDB)"
} else {
  $backendLabel = "Express (MongoMemoryServer)"
}
Write-Host ""

# ── Step 3: Start backend ──
Write-Host "[3/5] Starting backend ($backendLabel)..." -ForegroundColor Gray

if ($useMemoryServer) {
  # dev.js runs from root (it starts MongoMemoryServer + seed + server)
  Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList "backend/dev.js" `
    -WorkingDirectory $root
  Write-Host "  >> node backend/dev.js (background)" -ForegroundColor Green
} else {
  # For Docker MongoDB - start dev server without MemoryServer
  Start-Process -WindowStyle Hidden -FilePath "powershell" -ArgumentList @(
    '-NoExit'
    '-Command'
    "Set-Location '$backendDir'; Write-Host '=== KPPDF Backend ($backendLabel) ===' -ForegroundColor Cyan; npm run dev"
  )
  Write-Host "  >> npm run dev (background)" -ForegroundColor Green
}

Start-Sleep -Seconds 4

# ── Step 4: Start frontend ──
Write-Host ""
Write-Host "[4/5] Starting frontend (Angular)..." -ForegroundColor Gray

# Determine how to run Angular
$ngCmd = if (Get-Command "ng.cmd" -ErrorAction SilentlyContinue) { "ng.cmd" } else { "npx" }
$ngArgs = if ($ngCmd -eq "npx") { @("ng", "serve") } else { @("serve") }

Start-Process -WindowStyle Normal -FilePath "powershell" -ArgumentList @(
  '-NoExit'
  '-Command'
  "Set-Location '$root'; Write-Host '=== KPPDF Frontend (http://localhost:4200) ===' -ForegroundColor Cyan; & '$ngCmd' $ngArgs"
)
Write-Host "  >> $ngCmd $ngArgs (new window)" -ForegroundColor Green

# ── Wait for readiness and show summary ──
Write-Host ""
Write-Host "====== Waiting for services to start... ======" -ForegroundColor Cyan

$backendReady = Wait-ForEndpoint -Url "http://localhost:3000/api/v1/health" -Label "Backend" -TimeoutSeconds 90

Write-Host ""
if ($backendReady) {
  Write-Host "====== KPPDF 3.0 is running! ======" -ForegroundColor Cyan
  Write-Host "  Frontend: http://localhost:4200" -ForegroundColor White
  Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
  Write-Host "  Health:   http://localhost:3000/api/v1/health" -ForegroundColor White
  Write-Host "  Login:    admin / admin123" -ForegroundColor White
  Write-Host "==================================" -ForegroundColor Cyan

  # Open browser
  Start-Sleep -Seconds 3
  Start-Process "http://localhost:4200"
} else {
  Write-Host "WARNING: Backend did not respond within timeout." -ForegroundColor Red
  Write-Host "Check the backend terminal window for errors." -ForegroundColor Yellow
  Write-Host "Then open http://localhost:4200 manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To stop: .\stop.ps1" -ForegroundColor Gray
Write-Host "Or close the 'KPPDF Frontend' terminal window." -ForegroundColor Gray
Write-Host ""
