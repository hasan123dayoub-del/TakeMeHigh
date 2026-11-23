@echo off
rem Double-click to start TakeMeHigh (database + API + web). See scripts\start-takemehigh.ps1
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-takemehigh.ps1"
pause
