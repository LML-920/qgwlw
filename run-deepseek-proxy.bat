@echo off
title Xiaomi MiMo Proxy
cd /d "%~dp0"
echo Starting Xiaomi MiMo proxy...
echo Project path: %cd%
echo.

if exist "G:\NODE\node.exe" (
  "G:\NODE\node.exe" "%~dp0deepseek-proxy.js"
) else (
  node "%~dp0deepseek-proxy.js"
)

echo.
echo Proxy stopped. If there is an error above, send a screenshot to Codex.
pause
