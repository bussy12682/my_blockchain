# Start the Aethra node detached and capture logs
# Usage: From project `aethra` folder run in PowerShell:
#   .\scripts\start-detached.ps1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptDir '..')

# Ensure env defaults
$env:HOST = $env:HOST -or '0.0.0.0'
$env:P2P_PORT = $env:P2P_PORT -or '7100'

$log = Join-Path (Get-Location) 'server.log'
$err = Join-Path (Get-Location) 'server.err'

# Rotate old logs if present
if (Test-Path $log) { Rename-Item $log "$($log).$(Get-Date -Format yyyyMMddHHmmss)" -ErrorAction SilentlyContinue }
if (Test-Path $err) { Rename-Item $err "$($err).$(Get-Date -Format yyyyMMddHHmmss)" -ErrorAction SilentlyContinue }

Write-Host "Starting Aethra node (HOST=$env:HOST, P2P_PORT=$env:P2P_PORT)"
Start-Process -FilePath 'node' -ArgumentList 'src/server.js' -WorkingDirectory (Get-Location) -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden -PassThru | Out-Null
Write-Host "Detached process started. Logs: $log and $err"
Write-Host "To follow logs: Get-Content server.log -Wait"