@echo off
title Open Web With Xiaomi MiMo Proxy
cd /d "%~dp0"
echo Starting Xiaomi MiMo proxy in a new window...

start "Xiaomi MiMo Proxy - DO NOT CLOSE" "%~dp0start-proxy-window.bat"

echo Waiting for proxy...
timeout /t 2 /nobreak >nul

echo Opening web page...
start "" "%~dp0unpackage\dist\build\web\index.html"

echo.
echo If the web page still reports ERR_CONNECTION_REFUSED, keep the Xiaomi MiMo Proxy window open and refresh the page with Ctrl+F5.
pause
