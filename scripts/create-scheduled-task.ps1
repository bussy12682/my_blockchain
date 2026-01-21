# Create a scheduled task to start the Aethra node at system startup (requires Administrator)
# Usage (Admin): .\scripts\create-scheduled-task.ps1

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "This script must be run as Administrator. Right-click and run PowerShell as Administrator."
    exit 1
}

$taskName = "AethraNode"
$scriptFull = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'start-detached.ps1'
$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptFull`""
$trigger = New-ScheduledTaskTrigger -AtStartup

# Register scheduled task to run with highest privileges
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -RunLevel Highest -Force

Write-Host "Scheduled task '$taskName' registered to run at startup and call: $scriptFull"