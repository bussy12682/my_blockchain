# Add Windows Defender Firewall rules for Aethra (requires Administrator)
# Run in an elevated PowerShell prompt (Run as Administrator)

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "This script must be run as Administrator. Right-click and run PowerShell as Administrator."
    exit 1
}

Write-Host "Adding inbound firewall rules for Aethra..."

# REST API
New-NetFirewallRule -DisplayName "Aethra REST (3000)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Any -ErrorAction SilentlyContinue

# P2P WebSocket
New-NetFirewallRule -DisplayName "Aethra P2P (7100)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 7100 -Profile Any -ErrorAction SilentlyContinue

Write-Host "Firewall rules created. Verify with:`n  Get-NetFirewallRule -DisplayName 'Aethra *'`"