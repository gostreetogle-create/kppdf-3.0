@echo off
REM KPPDF 3.0 — запуск dev (обёртка для start.ps1, без опечаток start.ps1с)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
