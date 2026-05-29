# KPPDF 3.0 — preflight перед деплоем (Windows PowerShell)
# Usage: .\deploy\synology\preflight.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

Write-Host ""
Write-Host "=== KPPDF Preflight ===" -ForegroundColor Cyan
Write-Host ""

$ok = $true

function Check($name, $cmd) {
    try {
        $null = Invoke-Expression $cmd 2>$null
        Write-Host "  [OK] $name" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        return $false
    }
}

# Node
if (-not (Check "Node.js" "node --version")) { $ok = $false }
if (-not (Check "npm" "npm --version")) { $ok = $false }

# Python + paramiko
if (-not (Check "Python" "python --version")) { $ok = $false }
$paramiko = python -c "import paramiko; print(paramiko.__version__)" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] paramiko $paramiko" -ForegroundColor Green
} else {
    Write-Host "  [WARN] paramiko не установлен — pip install -r deploy/synology/requirements.txt" -ForegroundColor Yellow
}

# Config
$configPath = Join-Path $Root "deploy\synology\config.env"
if (-not (Test-Path $configPath)) {
    Write-Host "  [FAIL] config.env не найден" -ForegroundColor Red
    Write-Host "         Скопируй: copy deploy\synology\config.env.example deploy\synology\config.env" -ForegroundColor Yellow
    $ok = $false
} else {
    Write-Host "  [OK] config.env" -ForegroundColor Green
    $cfg = Get-Content $configPath -Raw
    if ($cfg -match "CHANGE_ME") {
        Write-Host "  [WARN] JWT_SECRET / JWT_REFRESH_SECRET — замени CHANGE_ME на случайные строки" -ForegroundColor Yellow
    }
    if ($cfg -notmatch "KPPDF_DATA_DIR=") {
        Write-Host "  [WARN] KPPDF_DATA_DIR не задан — будет /var/lib/kppdf (ubuntu default)" -ForegroundColor Yellow
    }
}

# Source
@("backend\src", "shared\types", "docker-compose.prod.yml") | ForEach-Object {
    if (Test-Path (Join-Path $Root $_)) {
        Write-Host "  [OK] $_" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $_ missing" -ForegroundColor Red
        $ok = $false
    }
}

# SSH test (if config exists)
if (Test-Path $configPath) {
    $hostLine = (Get-Content $configPath | Where-Object { $_ -match "^DEPLOY_HOST=" }) -replace "DEPLOY_HOST=", ""
    $userLine = (Get-Content $configPath | Where-Object { $_ -match "^DEPLOY_USER=" }) -replace "DEPLOY_USER=", ""
    if ($hostLine -and $userLine) {
        Write-Host ""
        Write-Host "  Проверка SSH $userLine@$hostLine ..." -ForegroundColor Cyan
        ssh -o ConnectTimeout=5 -o BatchMode=yes "$userLine@$hostLine" "echo OK && docker --version" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] SSH + Docker на сервере" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] SSH недоступен (ключ? пароль? server-setup-ubuntu.sh?)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
if ($ok) {
    Write-Host "Preflight OK — можно деплоить:" -ForegroundColor Green
    Write-Host "  python deploy/synology/deploy.py --seed" -ForegroundColor White
} else {
    Write-Host "Preflight FAILED — исправь ошибки выше" -ForegroundColor Red
    exit 1
}
