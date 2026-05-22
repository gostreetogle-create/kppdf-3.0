<#
.SYNOPSIS
  KPPDF 3.0 - Stop all processes
.DESCRIPTION
  Kills processes on ports 3000 (backend) and 4200 (frontend)
#>

$BackendPort = 3000
$FrontendPort = 4200

Write-Host "=== KPPDF 3.0 Stopper ===" -ForegroundColor Cyan
Write-Host ""

function Kill-ProcessOnPort($Port, $Name) {
    # Method 1: Get-NetTCPConnection (modern PowerShell, may need admin)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conn) {
            $pid = $conn.OwningProcess
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  [KILL] $Name (PID $pid) on port $Port" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force
                return
            }
        }
    } catch {
        # Fall through to method 2
    }

    # Method 2: netstat + find PID (works without admin)
    try {
        $netstat = netstat -ano | Select-String ":$Port\s"
        if ($netstat) {
            $parts = $netstat.ToString() -split '\s+'
            $pid = $parts[-1]
            if ($pid -and $pid -match '^\d+$') {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  [KILL] $Name (PID $pid) on port $Port (netstat)" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force
                    return
                }
            }
        }
    } catch {
        # Fall through
    }

    # Method 3: Kill by process name (crude)
    if ($Name -eq "Backend") {
        $procs = Get-Process -Name "node" -ErrorAction SilentlyContinue
        # Only kill if backend processes exist (assume they're ours)
        if ($procs) {
            Write-Host "  [KILL] $Name - all node processes" -ForegroundColor Yellow
            $procs | Stop-Process -Force
            return
        }
    }

    Write-Host "  [OK]   $Name - not running" -ForegroundColor Green
}

Kill-ProcessOnPort $BackendPort "Backend"
Kill-ProcessOnPort $FrontendPort "Frontend"

# Also kill any lingering ng processes
$ngProcs = Get-Process -Name "ng" -ErrorAction SilentlyContinue
if ($ngProcs) {
    Write-Host "  [KILL] Additional ng processes" -ForegroundColor Yellow
    $ngProcs | Stop-Process -Force
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
