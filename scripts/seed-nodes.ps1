<#
PowerShell script to connect nodes together after docker-compose up.
Run this from the host where docker-compose publishes mapped ports.
#>

$nodes = @(
  @{ Host = '127.0.0.1'; HttpPort = 3000; WsPort = 6001 },
  @{ Host = '127.0.0.1'; HttpPort = 3001; WsPort = 6002 },
  @{ Host = '127.0.0.1'; HttpPort = 3002; WsPort = 6003 }
)

function Connect-Peers($source, $target) {
  $uri = "http://$($source.Host):$($source.HttpPort)/peer/connect"
  $body = @{ address = "ws://$($target.Host):$($target.WsPort)" } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 5 | Out-Null
    Write-Host "Connected $($source.HttpPort) -> ws://$($target.Host):$($target.WsPort)"
  } catch {
    Write-Warning "Failed to connect $($source.HttpPort) -> ws://$($target.Host):$($target.WsPort): $_"
  }
}

foreach ($s in $nodes) {
  foreach ($t in $nodes) {
    if ($s.HttpPort -ne $t.HttpPort) {
      Connect-Peers $s $t
    }
  }
}

Write-Host "Seed node connection attempts complete." 
