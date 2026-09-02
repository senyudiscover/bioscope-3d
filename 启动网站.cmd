@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0启动网站.ps1"
if errorlevel 1 pause
