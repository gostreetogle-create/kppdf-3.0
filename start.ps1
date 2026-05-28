<#
.SYNOPSIS
  KPPDF 3.0 — локальный запуск одной командой (Windows).

.EXAMPLE
  .\start.ps1
  .\dev.ps1
  .\start.cmd
  Docker MongoDB + backend + frontend + YouGile sync + браузер.

.EXAMPLE
  .\start.ps1 -SkipDocker
  In-memory MongoDB (без Docker).

.EXAMPLE
  .\start.ps1 -Reseed
  Принудительно пересоздать тестовые данные.
#>

param(
  [switch]$SkipDocker,
  [switch]$Reseed
)

# Быстрый запуск (скопируйте):  .\start.cmd   или   .\s.cmd   или   .\dev.ps1
# Двойной щелчок: START-DEV.bat
# Опечатка start.ps1с в PowerShell:  cmd /c .\start.ps1с

$ErrorActionPreference = 'Continue'

$Root = $PSScriptRoot
$YougileDir = Join-Path (Split-Path $Root -Parent) 'yougile-sync-server'
& node (Join-Path $Root '.opencode/lock/setup-githooks.mjs') 2>$null
$BackendDir = Join-Path $Root 'backend'
$MongoDb = 'kppdf30'
$MongoUri = "mongodb://localhost:27017/$MongoDb"
$HealthUrl = 'http://localhost:3000/api/v1/health'
$FrontUrl = 'http://localhost:4200'
$YougileHealthUrl = 'http://localhost:3002/api/health'
$SessionFile = Join-Path $Root '.kppdf-dev.session.json'

# ── Helpers ───────────────────────────────────────────────────

function Stop-DevProcess([int]$ProcessId, [string]$Label) {
  if ($ProcessId -le 0 -or $ProcessId -eq $PID) { return }
  $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $proc) { return }
  Write-Host "  close $Label (PID $ProcessId, $($proc.ProcessName))" -ForegroundColor Yellow
  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-LingeringDevProcesses {
  $ngProcs = Get-Process -Name 'ng' -ErrorAction SilentlyContinue
  if ($ngProcs) {
    Write-Host '  stop lingering ng processes' -ForegroundColor Yellow
    $ngProcs | Stop-Process -Force -ErrorAction SilentlyContinue
  }

  try {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -match 'tsx|ng serve|backend/dev\.js|npm run dev|yougile-sync-server' } |
      ForEach-Object {
        Write-Host "  stop node (PID $($_.ProcessId))" -ForegroundColor Yellow
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
      }
  } catch { }
}

function Stop-PreviousDevSessions {
  Write-Host '  close previous dev windows...' -ForegroundColor Gray

  if (Test-Path $SessionFile) {
    try {
      $session = Get-Content $SessionFile -Raw | ConvertFrom-Json
      Stop-DevProcess -ProcessId ([int]$session.backendWindowPid) -Label 'backend window'
      Stop-DevProcess -ProcessId ([int]$session.frontendWindowPid) -Label 'frontend window'
      Stop-DevProcess -ProcessId ([int]$session.yougileWindowPid) -Label 'yougile sync window'
    } catch {
      Write-Host '  session file unreadable, skip' -ForegroundColor DarkYellow
    }
    Remove-Item $SessionFile -Force -ErrorAction SilentlyContinue
  }

  Stop-Port -Port 3000
  Stop-Port -Port 3002
  Stop-Port -Port 4200
  Stop-LingeringDevProcesses
  Start-Sleep -Milliseconds 400
}

function Save-DevSession([int]$BackendWindowPid, [int]$FrontendWindowPid, [int]$YougileWindowPid) {
  @{
    backendWindowPid  = $BackendWindowPid
    frontendWindowPid = $FrontendWindowPid
    yougileWindowPid  = $YougileWindowPid
    startedAt         = (Get-Date).ToString('o')
  } | ConvertTo-Json | Set-Content $SessionFile -Encoding UTF8
}

function Write-Step([string]$Text) {
  Write-Host $Text -ForegroundColor Gray
}

function Test-HttpOk([string]$Url) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
    return ($r.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Test-TcpOpen([int]$Port, [int]$TimeoutMs = 300) {
  $client = $null
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $task = $client.ConnectAsync('127.0.0.1', $Port)
    if (-not $task.Wait($TimeoutMs)) { return $false }
    return $client.Connected
  } catch {
    return $false
  } finally {
    if ($client) { $client.Dispose() }
  }
}

function Get-PortPids([int]$Port) {
  $pids = @()
  try {
    $pids += Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
  } catch { }

  if ($pids.Count -eq 0) {
    $pids += netstat -ano | Select-String ":$Port\s" | ForEach-Object {
      ($_.ToString() -split '\s+')[-1]
    } | Where-Object { $_ -match '^\d+$' } | ForEach-Object { [int]$_ }
  }

  return ($pids | Select-Object -Unique)
}

function Stop-Port([int]$Port) {
  $pids = Get-PortPids -Port $Port
  if ($pids.Count -eq 0) {
    Write-Host "  :$Port free" -ForegroundColor Green
    return
  }

  foreach ($procId in $pids) {
    if ($procId -eq $PID) { continue }
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Host "  :$Port stop $($proc.ProcessName) (PID $procId)" -ForegroundColor Yellow
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

function Wait-Http([string]$Url, [string]$Label, [int]$Seconds = 120) {
  if (Test-HttpOk -Url $Url) {
    Write-Host "  $Label ready" -ForegroundColor Green
    return $true
  }

  Write-Host "  wait $Label..." -NoNewline
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-HttpOk -Url $Url) {
      Write-Host " OK" -ForegroundColor Green
      return $true
    }
    Start-Sleep -Milliseconds 800
    Write-Host "." -NoNewline
  }
  Write-Host " TIMEOUT" -ForegroundColor Red
  return $false
}

function Ensure-NodeModules([string]$Dir, [string]$Label) {
  if (Test-Path (Join-Path $Dir 'node_modules')) {
    Write-Host "  $Label OK" -ForegroundColor Green
    return
  }
  Write-Host "  $Label npm install..." -ForegroundColor Yellow
  Push-Location $Dir
  $null = npm install --legacy-peer-deps 2>$null
  Pop-Location
}

function Ensure-EnvFile {
  $envFile = Join-Path $BackendDir '.env'
  $example = Join-Path $BackendDir '.env.example'

  if (-not (Test-Path $envFile)) {
    Copy-Item $example $envFile
    Write-Host "  created backend/.env" -ForegroundColor Green
    return
  }

  $content = Get-Content $envFile -Raw
  if ($content -notmatch "MONGO_URI=$([regex]::Escape($MongoUri))") {
    ($content -split "`n") | ForEach-Object {
      if ($_ -match '^MONGO_URI=') { "MONGO_URI=$MongoUri" } else { $_ }
    } | Set-Content $envFile
    Write-Host "  MONGO_URI -> $MongoUri" -ForegroundColor Yellow
  } else {
    Write-Host "  backend/.env OK" -ForegroundColor Green
  }
}

function Test-MongoDockerOk {
  $status = docker inspect -f '{{.State.Status}}' kppdf-mongodb 2>$null
  if ($LASTEXITCODE -ne 0 -or $status -ne 'running') { return $false }

  $mapped = docker port kppdf-mongodb 27017 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $mapped) { return $false }

  $health = docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' kppdf-mongodb 2>$null
  if ($health -eq 'healthy') { return $true }

  return (Test-TcpOpen -Port 27017)
}

function Wait-Mongo([int]$Seconds = 30) {
  Write-Host "  wait MongoDB :27017..." -NoNewline
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-TcpOpen -Port 27017) {
      Write-Host " OK" -ForegroundColor Green
      return $true
    }
    Start-Sleep -Milliseconds 500
    Write-Host "." -NoNewline
  }
  Write-Host " TIMEOUT" -ForegroundColor Red
  return $false
}

function Ensure-MongoDocker {
  Push-Location $Root
  try {
    if (Test-MongoDockerOk) {
      Write-Host "  MongoDB OK (reuse)" -ForegroundColor Green
      return $true
    }

    Write-Host "  docker compose up -d mongodb" -ForegroundColor Yellow
    $out = docker compose up -d mongodb 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
      Write-Host $out -ForegroundColor Red
      return $false
    }

    return (Wait-Mongo)
  } finally {
    Pop-Location
  }
}

function Test-DbEmpty {
  $count = docker exec kppdf-mongodb mongosh $MongoDb --quiet --eval 'db.users.countDocuments()' 2>$null
  if ($LASTEXITCODE -ne 0) { return $true }
  return ([int]$count -eq 0)
}

function Invoke-Seed {
  Write-Host "  npm run seed..." -ForegroundColor Yellow
  Push-Location $BackendDir
  npm run seed
  $ok = ($LASTEXITCODE -eq 0)
  Pop-Location
  if ($ok) {
    Write-Host "  seed OK" -ForegroundColor Green
  } else {
    Write-Host "  seed FAILED" -ForegroundColor Red
  }
  return $ok
}

function Ensure-YougileEnv {
  if (-not (Test-Path $YougileDir)) {
    Write-Host "  yougile-sync-server not found: $YougileDir" -ForegroundColor Red
    return $false
  }

  $envFile = Join-Path $YougileDir '.env'
  $example = Join-Path $YougileDir '.env.example'
  if (-not (Test-Path $envFile)) {
    if (Test-Path $example) {
      Copy-Item $example $envFile
      Write-Host "  created yougile-sync-server/.env (fill YG_API_TOKEN)" -ForegroundColor Yellow
    } else {
      Write-Host "  missing yougile-sync-server/.env" -ForegroundColor Red
      return $false
    }
  } else {
    Write-Host "  yougile-sync-server/.env OK" -ForegroundColor Green
  }

  return $true
}

function Start-YougileSync {
  if (-not (Test-Path $YougileDir)) {
    Write-Host "  skip YouGile sync (folder missing)" -ForegroundColor DarkYellow
    return 0
  }

  $proc = Start-Process -WindowStyle Normal -FilePath 'powershell' -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "`$Host.UI.RawUI.WindowTitle = 'YouGile Sync'; Set-Location '$YougileDir'; Write-Host 'YouGile sync: http://localhost:3002/api/health' -ForegroundColor Cyan; npm run dev"
  ) -PassThru
  Write-Host "  yougile-sync-server npm run dev (window PID $($proc.Id))" -ForegroundColor Green
  return $proc.Id
}

function Start-Backend([bool]$UseMemory) {
  if ($UseMemory) {
    $proc = Start-Process -WindowStyle Normal -FilePath 'node' -ArgumentList 'backend/dev.js' -WorkingDirectory $Root -PassThru
    Write-Host "  node backend/dev.js (PID $($proc.Id))" -ForegroundColor Green
    return $proc.Id
  }

  $proc = Start-Process -WindowStyle Normal -FilePath 'powershell' -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "`$Host.UI.RawUI.WindowTitle = 'KPPDF Backend'; Set-Location '$BackendDir'; npm run dev"
  ) -PassThru
  Write-Host "  npm run dev (window PID $($proc.Id))" -ForegroundColor Green
  return $proc.Id
}

function Start-Frontend {
  $proc = Start-Process -WindowStyle Normal -FilePath 'powershell' -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "`$Host.UI.RawUI.WindowTitle = 'KPPDF Frontend'; Set-Location '$Root'; Write-Host 'Frontend: http://localhost:4200' -ForegroundColor Cyan; npx ng serve"
  ) -PassThru
  Write-Host "  npx ng serve (window PID $($proc.Id))" -ForegroundColor Green
  return $proc.Id
}

function Show-Ready {
  Write-Host ""
  Write-Host "====== KPPDF 3.0 ready ======" -ForegroundColor Cyan
  Write-Host "  http://localhost:4200" -ForegroundColor White
  Write-Host "  YouGile sync: http://localhost:3002/api/health" -ForegroundColor White
  Write-Host "  login: admin / admin123" -ForegroundColor White
  Write-Host "=============================" -ForegroundColor Cyan
  Start-Process $FrontUrl
}

# ── Main ──────────────────────────────────────────────────────

Write-Host ""
Write-Host "========== KPPDF 3.0 ==========" -ForegroundColor Cyan
Write-Host ""

Write-Step '[1/7] Close previous dev windows'
Stop-PreviousDevSessions
Write-Host ""

Write-Step "[2/7] Dependencies"
Ensure-NodeModules -Dir $Root -Label 'Frontend'
Ensure-NodeModules -Dir $BackendDir -Label 'Backend'
if (Test-Path $YougileDir) {
  Ensure-NodeModules -Dir $YougileDir -Label 'YouGile sync'
  Ensure-YougileEnv | Out-Null
} else {
  Write-Host "  YouGile sync folder missing: $YougileDir" -ForegroundColor DarkYellow
}
Ensure-EnvFile
Write-Host ""

Write-Step "[3/7] Ports"
Stop-Port -Port 3000
Stop-Port -Port 3002
Stop-Port -Port 4200
Write-Host ""

$useMemory = $false
$mongoOk = $false

Write-Step "[4/7] Database"
if ($SkipDocker) {
  Write-Host "  MongoMemoryServer (dev.js)" -ForegroundColor Yellow
  $useMemory = $true
  $mongoOk = $true
} else {
  $mongoOk = Ensure-MongoDocker
  if (-not $mongoOk) {
    Write-Host "  Docker failed -> MongoMemoryServer" -ForegroundColor Yellow
    $useMemory = $true
    $mongoOk = $true
  }
}

if ($mongoOk -and -not $useMemory -and ($Reseed -or (Test-DbEmpty))) {
  if (-not (Invoke-Seed)) { exit 1 }
} elseif ($mongoOk -and -not $useMemory) {
  Write-Host "  seed skip (data exists)" -ForegroundColor Green
}
Write-Host ""

Write-Step "[5/7] Start services"
$backendWindowPid = Start-Backend -UseMemory $useMemory
$yougileWindowPid = Start-YougileSync
$frontendWindowPid = Start-Frontend
Save-DevSession -BackendWindowPid $backendWindowPid -FrontendWindowPid $frontendWindowPid -YougileWindowPid $yougileWindowPid
Write-Host ""

Write-Step "[6/7] Wait services"
$backendOk = Wait-Http -Url $HealthUrl -Label 'Backend' -Seconds 90
$yougileOk = Wait-Http -Url $YougileHealthUrl -Label 'YouGile sync' -Seconds 60
$frontOk = $false
if ($backendOk) {
  $frontOk = Wait-Http -Url $FrontUrl -Label 'Frontend' -Seconds 180
}
Write-Host ""

Write-Step "[7/7] Browser"

Write-Host ""
if ($backendOk) {
  if (-not $yougileOk) {
    Write-Host 'YouGile sync not ready — check window (YG_API_TOKEN in yougile-sync-server/.env).' -ForegroundColor Yellow
  }
  if (-not $frontOk) {
    Write-Host 'Frontend still compiling - opening browser anyway.' -ForegroundColor Yellow
  }
  Show-Ready
} else {
  Write-Host 'Backend not ready. Fix errors in Backend window, then run .\start.ps1 again.' -ForegroundColor Red
}

Write-Host ""
Write-Host "Stop: .\stop.ps1" -ForegroundColor Gray
Write-Host ""
