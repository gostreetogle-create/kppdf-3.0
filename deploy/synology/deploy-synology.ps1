# Деплой одной командой (Windows)
# Usage: .\deploy\synology\deploy-synology.ps1 [-Seed] [-SkipBuild]

param(
    [switch]$Seed,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

Write-Host ""
Write-Host "=== KPPDF Deploy Synology ===" -ForegroundColor Cyan

& "$PSScriptRoot\preflight.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

$args = @("deploy/synology/deploy.py")
if ($Seed) { $args += "--seed" }
if ($SkipBuild) { $args += "--skip-build" }

python @args
