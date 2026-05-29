@echo off
title KPPDF 3.0 - запуск
cd /d "%~dp0"
node "%~dp0scripts\write-ps1-utf8bom.mjs" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
pause
pause
