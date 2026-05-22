<#
.SYNOPSIS
  KPPDF 3.0 - One-command launcher for Windows
.DESCRIPTION
  1. Kills processes on ports 3000 (backend) and 4200 (frontend)
  2. Starts backend (Express + MongoMemoryServer) in background
  3. Starts frontend (Angular) in separate terminal window
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
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conn) {
            $pid = $conn.OwningProcess
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  [KILL] Port $Port - $($proc.ProcessName) (PID $pid)" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force
                Start-Sleep -Milliseconds 500
            }
        } else {
            Write-Host "  [OK]   Port $Port - free" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [WARN] Could not check port $Port : $_" -ForegroundColor Yellow
    }
}

Write-Host "[1/4] Freeing ports..." -ForegroundColor Gray
Kill-ProcessOnPort $BackendPort
Kill-ProcessOnPort $FrontendPort

# ---- 2. Start backend (hidden, no window) ----
Write-Host ""
Write-Host "[2/4] Starting backend (Express + MongoDB)..." -ForegroundColor Gray

Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList "backend/dev.js" `
    -WorkingDirectory $RootDir

Write-Host "  [OK]  Backend started (node backend/dev.js)" -ForegroundColor Green
Start-Sleep -Seconds 4

# ---- 3. Start frontend (visible terminal window) ----
Write-Host ""
Write-Host "[3/4] Starting frontend (Angular)..." -ForegroundColor Gray

# Determine which command to use
$ngCmd = if (Get-Command "ng.cmd" -ErrorAction SilentlyContinue) { "ng.cmd" } else { "npx" }
$ngArgs = if ($ngCmd -eq "npx") { @("ng", "serve") } else { @("serve") }

Start-Process -WindowStyle Normal -FilePath "powershell" `
    -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir'; Write-Host '=== KPPDF Frontend (http://localhost:4200) ===' -ForegroundColor Cyan; & '$ngCmd' $ngArgs"

Write-Host "  [OK]  Frontend starting in new window" -ForegroundColor Green

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
Write-Host "To stop:" -ForegroundColor Gray
Write-Host "  - Close the 'KPPDF Frontend' terminal window" -ForegroundColor Gray
Write-Host "  - Or run: .\stop.ps1" -ForegroundColor Gray
Write-Host "  - Or kill processes on ports $BackendPort and $FrontendPort" -ForegroundColor Gray
Write-Host ""
Write-Host "This terminal can now be closed safely." -ForegroundColor Green
