@echo off
rem Double-click to start Safarni (database + API + web). See scripts\start-safarni.ps1
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-safarni.ps1"
pause
