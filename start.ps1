<#
.SYNOPSIS
  KPPDF 3.0 - One-command launcher for Windows
.DESCRIPTION
  1. Kills processes on ports 3000 (backend) and 4200 (frontend)
  2. Starts backend (Express + MongoMemoryServer) in background
  3. Starts frontend (Angular) in background
  4. Opens browser at http://localhost:4200
#>

param()

$BackendPort = 3000
$FrontendPort = 4200
$RootDir = $PSScriptRoot

Write-Host "=== KPPDF 3.0 Launcher ===" -ForegroundColor Cyan
Write-Host ""

# ---- 1. Kill processes on target ports ----
function Kill-ProcessOnPort($Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  [KILL] Port $Port - $($proc.ProcessName) (PID $pid)" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
        }
    } else {
        Write-Host "  [OK]   Port $Port - free" -ForegroundColor Green
    }
}

Write-Host "[1/4] Freeing ports..." -ForegroundColor Gray
Kill-ProcessOnPort $BackendPort
Kill-ProcessOnPort $FrontendPort
Start-Sleep -Seconds 1

# ---- 2. Start backend ----
Write-Host ""
Write-Host "[2/4] Starting backend (Express + MongoDB)..." -ForegroundColor Gray

$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location -LiteralPath $dir
    & "node" "backend/dev.js"
} -ArgumentList $RootDir

Write-Host "  [OK]  Backend started (Job ID: $($backendJob.Id))" -ForegroundColor Green
Start-Sleep -Seconds 4

# ---- 3. Start frontend ----
Write-Host ""
Write-Host "[3/4] Starting frontend (Angular)..." -ForegroundColor Gray

$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location -LiteralPath $dir
    if (Get-Command "ng.cmd" -ErrorAction SilentlyContinue) {
        & "ng.cmd" "serve"
    } else {
        & "npx" "ng" "serve"
    }
} -ArgumentList $RootDir

Write-Host "  [OK]  Frontend started (Job ID: $($frontendJob.Id))" -ForegroundColor Green

# ---- 4. Open browser ----
Write-Host ""
Write-Host "[4/4] Opening browser..." -ForegroundColor Gray
Start-Sleep -Seconds 8
Start-Process "http://localhost:4200"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KPPDF 3.0 is running!" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Login:    admin / admin123" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop: press Ctrl+C or run: Get-Job | Stop-Job" -ForegroundColor Gray
Write-Host ""

# Keep alive and monitor jobs
while ($true) {
    Start-Sleep -Seconds 10
    $backendOk = $backendJob.State -eq 'Running'
    $frontendOk = $frontendJob.State -eq 'Running'

    if (-not $backendOk -or -not $frontendOk) {
        Write-Host ""
        Write-Host "[WARN] A process stopped!" -ForegroundColor Yellow
        if (-not $backendOk) { Write-Host "  Backend: STOPPED" -ForegroundColor Red }
        if (-not $frontendOk) { Write-Host "  Frontend: STOPPED" -ForegroundColor Red }
        Write-Host "  Restart with: .\start.ps1" -ForegroundColor Yellow
        break
    }
}
