<#
.SYNOPSIS
  KPPDF 3.0 — локальный запуск одной командой (Windows).

.EXAMPLE
  .\start.ps1
  Docker MongoDB + backend + frontend + браузер.

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

$ErrorActionPreference = 'Continue'

$Root = $PSScriptRoot
$BackendDir = Join-Path $Root 'backend'
$MongoDb = 'kppdf30'
$MongoUri = "mongodb://localhost:27017/$MongoDb"
$HealthUrl = 'http://localhost:3000/api/v1/health'
$FrontUrl = 'http://localhost:4200'

# ── Helpers ───────────────────────────────────────────────────

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

function Start-Backend([bool]$UseMemory) {
  if ($UseMemory) {
    Start-Process -WindowStyle Normal -FilePath 'node' -ArgumentList 'backend/dev.js' -WorkingDirectory $Root
    Write-Host "  node backend/dev.js" -ForegroundColor Green
    return
  }

  Start-Process -WindowStyle Normal -FilePath 'powershell' -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$BackendDir'; npm run dev"
  )
  Write-Host "  npm run dev" -ForegroundColor Green
}

function Start-Frontend {
  Start-Process -WindowStyle Normal -FilePath 'powershell' -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$Root'; Write-Host 'Frontend: http://localhost:4200' -ForegroundColor Cyan; npx ng serve"
  )
  Write-Host "  npx ng serve (new window)" -ForegroundColor Green
}

function Show-Ready {
  Write-Host ""
  Write-Host "====== KPPDF 3.0 ready ======" -ForegroundColor Cyan
  Write-Host "  http://localhost:4200" -ForegroundColor White
  Write-Host "  login: admin / admin123" -ForegroundColor White
  Write-Host "=============================" -ForegroundColor Cyan
  Start-Process $FrontUrl
}

# ── Main ──────────────────────────────────────────────────────

Write-Host ""
Write-Host "========== KPPDF 3.0 ==========" -ForegroundColor Cyan
Write-Host ""

Write-Step "[1/5] Dependencies"
Ensure-NodeModules -Dir $Root -Label 'Frontend'
Ensure-NodeModules -Dir $BackendDir -Label 'Backend'
Ensure-EnvFile
Write-Host ""

if ((Test-HttpOk -Url $HealthUrl) -and (Test-HttpOk -Url $FrontUrl)) {
  Write-Host "Already running." -ForegroundColor Green
  Show-Ready
  exit 0
}

$backendUp = Test-HttpOk -Url $HealthUrl
$frontendUp = Test-HttpOk -Url $FrontUrl

Write-Step "[2/5] Ports"
if (-not $backendUp) {
  Stop-Port -Port 3000
  # backend down - restart frontend too (stale ng serve)
  if ($frontendUp) {
    Write-Host "  backend down -> restart frontend too" -ForegroundColor Yellow
    Stop-Port -Port 4200
    $frontendUp = $false
  }
} else {
  Write-Host "  :3000 backend OK" -ForegroundColor Green
}

if (-not $frontendUp) {
  Stop-Port -Port 4200
} else {
  Write-Host "  :4200 frontend OK" -ForegroundColor Green
}
Write-Host ""

$useMemory = $false
$mongoOk = $false

Write-Step "[3/5] Database"
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

Write-Step "[4/5] Start services"
$needBackend = -not $backendUp
$needFrontend = -not $frontendUp

if ($needBackend) { Start-Backend -UseMemory $useMemory } else { Write-Host "  backend skip" -ForegroundColor Green }
if ($needFrontend) { Start-Frontend } else { Write-Host "  frontend skip (http://localhost:4200)" -ForegroundColor Green }
Write-Host ""

Write-Step "[5/5] Wait + browser"
$backendOk = if ($needBackend) { Wait-Http -Url $HealthUrl -Label 'Backend' -Seconds 90 } else { $backendUp }

$frontOk = $frontendUp
if ($backendOk -and $needFrontend) {
  $frontOk = Wait-Http -Url $FrontUrl -Label 'Frontend' -Seconds 180
} elseif ($backendOk -and -not $frontOk) {
  $frontOk = Wait-Http -Url $FrontUrl -Label 'Frontend' -Seconds 60
}

Write-Host ""
if ($backendOk) {
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
