<#
.SYNOPSIS
  KPPDF 3.0 - Stop all processes and optionally stop Docker
.DESCRIPTION
  1. Kills processes on ports 3000 (backend) and 4200 (frontend)
  2. Optionally stops Docker MongoDB container
.PARAMETER Ports
  Ports to free. Default: @(3000, 4200).
.PARAMETER StopDocker
  If set, also stop Docker MongoDB container.
.EXAMPLE
  .\stop.ps1
  Stop processes on ports 3000 and 4200.

  .\stop.ps1 -Ports @(3000,4200,9229) -StopDocker
  Stop three ports + Docker MongoDB.
#>

param(
  [int[]]$Ports = @(3000, 4200),
  [switch]$StopDocker
)

Write-Host "========== KPPDF 3.0 - Stopper ==========" -ForegroundColor Cyan
Write-Host ""

# Helper: stop process on a port
function Kill-ProcessOnPort($Port, $Name) {
  # Method 1: Get-NetTCPConnection
  $pid = $null
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    $pid = $conn.OwningProcess
  }

  # Method 2: netstat fallback
  if (-not $pid) {
    $raw = netstat -ano 2> $null
    if ($raw) {
      $line = $raw | Select-String ":$Port\s"
      if ($line) {
        $parts = $line.ToString() -split '\s+'
        $candidate = $parts[-1]
        if ($candidate -match '^\d+$') {
          $pid = [int]$candidate
        }
      }
    }
  }

  if ($pid) {
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Host "  [KILL] $Name on port $Port - $($proc.ProcessName) (PID $pid)" -ForegroundColor Yellow
      Stop-Process -Id $pid -Force
      return
    }
  }

  # Method 3: kill by process name
  if ($Name -eq "Backend") {
    $procs = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($procs) {
      Write-Host "  [KILL] $Name - all node processes" -ForegroundColor Yellow
      $procs | Stop-Process -Force
      return
    }
  }

  Write-Host "  [OK]   $Name - not running" -ForegroundColor Green
}

# Main
Write-Host "[1/2] Stopping processes..." -ForegroundColor Gray
foreach ($port in $Ports) {
  $label = if ($port -eq 3000) { "Backend" } elseif ($port -eq 4200) { "Frontend" } else { "Process on :$port" }
  Kill-ProcessOnPort -Port $port -Name $label
}

# Kill any lingering ng / node processes
$ngProcs = Get-Process -Name "ng" -ErrorAction SilentlyContinue
if ($ngProcs) {
  Write-Host "  [KILL] Additional ng processes" -ForegroundColor Yellow
  $ngProcs | Stop-Process -Force
}

# Detect tsx watch processes via WMI
try {
  $tsxNodes = Get-WmiObject Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'tsx' }
  if ($tsxNodes) {
    $tsxPids = $tsxNodes | ForEach-Object { $_.ProcessId }
    foreach ($pid in $tsxPids) {
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "  [KILL] tsx watch (PID $pid)" -ForegroundColor Yellow
        Stop-Process -Id $pid -Force
      }
    }
  }
} catch {
  # Non-critical
}

# Docker
Write-Host ""
if ($StopDocker) {
  Write-Host "[2/2] Stopping Docker MongoDB..." -ForegroundColor Gray
  $null = docker compose down 2> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK]   MongoDB container stopped" -ForegroundColor Green
  } else {
    Write-Host "  [WARN] docker compose down returned exit $LASTEXITCODE" -ForegroundColor Yellow
  }
} else {
  Write-Host "[2/2] Skipped (use -StopDocker to also stop MongoDB container)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
