#Requires -RunAsAdministrator

$ruleName = 'ComandaFlow Restaurante - Rede Local'
$rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $rule) {
  $rule = New-NetFirewallRule `
    -DisplayName $ruleName `
    -Description 'Permite que iPhones e outros dispositivos da rede local acessem o ComandaFlow Restaurante.' `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 3002 `
    -RemoteAddress LocalSubnet `
    -Profile Any
} else {
  $rule | Set-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -Profile Any
  $rule | Get-NetFirewallPortFilter | Set-NetFirewallPortFilter -Protocol TCP -LocalPort 3002
  $rule | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -RemoteAddress LocalSubnet
}

Write-Host ''
Write-Host 'Rede local do ComandaFlow liberada na porta 3002.' -ForegroundColor Green
Write-Host 'A regra aceita somente aparelhos da mesma rede local.'
