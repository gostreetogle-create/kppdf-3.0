<#
.SYNOPSIS
  KPPDF 3.0 - Stop all processes and optionally stop Docker
.DESCRIPTION
  1. Kills processes on ports 3000 (backend), 3002 (YouGile sync), 4200 (frontend)
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
  [int[]]$Ports = @(3000, 3002, 4200),
  [switch]$StopDocker
)

Write-Host "========== KPPDF 3.0 - Stopper ==========" -ForegroundColor Cyan
Write-Host ""

$Root = $PSScriptRoot
$YougileDir = Join-Path (Split-Path $Root -Parent) 'yougile-sync-server'
$KppdfRootPattern = [regex]::Escape($Root)
$YougileDirPattern = [regex]::Escape($YougileDir)

function Test-KppdfDevProcess([string]$CommandLine) {
  if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
  if ($CommandLine -match 'kppdf-ai-analyst') { return $false }

  if ($CommandLine -match $YougileDirPattern) { return $true }
  if ($CommandLine -notmatch $KppdfRootPattern) { return $false }

  return ($CommandLine -match 'tsx|ng serve|backend/dev\.js|npm run dev')
}

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

  # Method 3: kill KPPDF dev node processes only (not kppdf-ai-analyst)
  if ($Name -eq "Backend") {
    try {
      $nodes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { Test-KppdfDevProcess $_.CommandLine }
      if ($nodes) {
        foreach ($node in $nodes) {
          Write-Host "  [KILL] $Name - node (PID $($node.ProcessId))" -ForegroundColor Yellow
          Stop-Process -Id $node.ProcessId -Force -ErrorAction SilentlyContinue
        }
        return
      }
    } catch { }
  }

  Write-Host "  [OK]   $Name - not running" -ForegroundColor Green
}

# Main
Write-Host "[1/2] Stopping processes..." -ForegroundColor Gray
$sessionFile = Join-Path $PSScriptRoot '.kppdf-dev.session.json'
if (Test-Path $sessionFile) {
  try {
    $session = Get-Content $sessionFile -Raw | ConvertFrom-Json
    foreach ($prop in @('backendWindowPid', 'frontendWindowPid', 'yougileWindowPid')) {
      $windowPid = [int]$session.$prop
      if ($windowPid -gt 0) {
        $proc = Get-Process -Id $windowPid -ErrorAction SilentlyContinue
        if ($proc) {
          Write-Host "  [KILL] dev window $prop (PID $windowPid)" -ForegroundColor Yellow
          Stop-Process -Id $windowPid -Force -ErrorAction SilentlyContinue
        }
      }
    }
  } catch { }
  Remove-Item $sessionFile -Force -ErrorAction SilentlyContinue
}

foreach ($port in $Ports) {
  $label = switch ($port) {
    3000 { 'Backend' }
    3002 { 'YouGile sync' }
    4200 { 'Frontend' }
    default { "Process on :$port" }
  }
  Kill-ProcessOnPort -Port $port -Name $label
}

# Kill any lingering ng / node processes
$ngProcs = Get-Process -Name "ng" -ErrorAction SilentlyContinue
if ($ngProcs) {
  Write-Host "  [KILL] Additional ng processes" -ForegroundColor Yellow
  $ngProcs | Stop-Process -Force
}

# Lingering KPPDF dev node processes
try {
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { Test-KppdfDevProcess $_.CommandLine } |
    ForEach-Object {
      Write-Host "  [KILL] node dev (PID $($_.ProcessId))" -ForegroundColor Yellow
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
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
