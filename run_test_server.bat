@echo off
cd /d "%~dp0"
title JCMind Portal Local Test Server

echo ===================================================
echo     Local Test Server Starting...
echo ===================================================
echo.
"%~dp0node-v20.11.1-win-x64\node.exe" server.js
pause
