@echo off
title KPPDF 3.0 — запуск
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
pause
