#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Backend = "C:\Users\user\kppdf-3.0\backend"
$Log = "$Backend\dev-output.log"

Write-Host "=== KPPDF 3.0 Full Pipeline ===" -ForegroundColor Cyan
Write-Host ""

# Clean up any previous runs
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# Start dev.js (background)
Write-Host "[1/4] Starting dev.js (MongoDB + seed + server)..." -ForegroundColor Yellow
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "node.exe"
$psi.Arguments = "`"$Backend\dev.js`""
$psi.WorkingDirectory = $Backend
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
$psi.EnvironmentVariables["FORCE_COLOR"] = "0"

$p = [System.Diagnostics.Process]::Start($psi)

# Wait for server to be ready (check log for "Server running")
Write-Host "[2/4] Waiting for server startup (seed + MongoDB)..." -ForegroundColor Yellow
$ready = $false
$timeout = 60
$elapsed = 0
while (-not $ready -and $elapsed -lt $timeout) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    if ($p.HasExited) {
        $stderr = $p.StandardError.ReadToEnd()
        $stdout = $p.StandardOutput.ReadToEnd()
        Write-Host "Process exited early (code: $($p.ExitCode))" -ForegroundColor Red
        Write-Host "STDOUT: $stdout" -ForegroundColor Gray
        Write-Host "STDERR: $stderr" -ForegroundColor Gray
        exit 1
    }
    # Try health endpoint
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) {
            $ready = $true
        }
    } catch {
        # Not ready yet
    }
}
if (-not $ready) {
    Write-Host "Server failed to start within $timeout seconds" -ForegroundColor Red
    $p.Kill()
    exit 1
}
Write-Host "[2/4] Server is ready!" -ForegroundColor Green

# Test all endpoints
Write-Host "`n[3/4] Testing all API endpoints..." -ForegroundColor Yellow
$base = "http://localhost:3000/api/v1"
$ok = 0
$total = 0

function Test-Endpoint($name, $method, $url, $body) {
    $script:total++
    try {
        if ($method -eq "GET") {
            $r = Invoke-WebRequest -Uri "$base$url" -UseBasicParsing -TimeoutSec 5
        } else {
            $json = $body | ConvertTo-Json
            $r = Invoke-WebRequest -Uri "$base$url" -Method POST -Body $json -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
        }
        if ($r.StatusCode -eq 200) {
            $script:ok++
            Write-Host "  OK   $name" -ForegroundColor Green
        } else {
            Write-Host "  FAIL $name (status: $($r.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "  FAIL $name (error: $($_.Exception.Message))" -ForegroundColor Red
    }
}

Test-Endpoint "/api/v1/health" "GET" "/health"
Test-Endpoint "/api/v1/directories/products" "GET" "/directories/products"
Test-Endpoint "/api/v1/directories/categories" "GET" "/directories/categories"
Test-Endpoint "/api/v1/directories/counterparties" "GET" "/directories/counterparties"
Test-Endpoint "/api/v1/directories/users" "GET" "/directories/users"
Test-Endpoint "/api/v1/directories/roles" "GET" "/directories/roles"
Test-Endpoint "/api/v1/directories/statuses" "GET" "/directories/statuses"
Test-Endpoint "/api/v1/directories/work-types" "GET" "/directories/work-types"
Test-Endpoint "/api/v1/directories/settings" "GET" "/directories/settings"
Test-Endpoint "/api/v1/auth/login" "POST" "/auth/login" @{username="admin";password="admin123"}
Test-Endpoint "/api/v1/dashboard/stats" "GET" "/dashboard/stats"

Write-Host ""
if ($ok -eq $total) {
    Write-Host "[3/4] $ok/$total endpoints OK" -ForegroundColor Green
} else {
    Write-Host "[3/4] $ok/$total endpoints OK (some failed)" -ForegroundColor Yellow
}

# Cleanup
Write-Host "[4/4] Cleaning up..." -ForegroundColor Yellow
$p.Kill()
Start-Sleep -Seconds 2
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "[4/4] Done" -ForegroundColor Green
Write-Host ""
Write-Host "=== Pipeline Complete ===" -ForegroundColor Cyan
if ($ok -eq $total) { exit 0 } else { exit 1 }
