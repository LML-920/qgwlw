@echo off
title Check Xiaomi MiMo Proxy
cd /d "%~dp0"
echo Checking http://127.0.0.1:8787/analyze ...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$body = @{ snapshot = @{ temperature = 26; humidity = 50; heartRate = 82; bloodOxygen = 97; mq2 = 8; mq7 = 6; personStatusText = 'normal'; braceletStatusText = 'worn' } } | ConvertTo-Json -Depth 5; try { $res = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8787/analyze' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 30; Write-Host 'Proxy OK. 小米 MiMo response:'; Write-Host $res.Content } catch { Write-Host 'Proxy not available or Xiaomi MiMo request failed:'; Write-Host $_.Exception.Message; if ($_.Exception.Response) { $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object System.IO.StreamReader($stream); Write-Host $reader.ReadToEnd() } }"

echo.
pause
