@echo off
title Open Web With Xiaomi MiMo Proxy
cd /d "%~dp0"
echo Starting Xiaomi MiMo proxy in a new window...

start "Xiaomi MiMo Proxy - DO NOT CLOSE" "%~dp0run-xiaomi-proxy.bat"

echo Waiting for proxy...
timeout /t 2 /nobreak >nul

echo Opening web page...
start "" "%~dp0unpackage\dist\build\web\index.html"

echo.
echo Keep the Xiaomi MiMo Proxy window open while using local AI features.
pause
