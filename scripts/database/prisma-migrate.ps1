Param()
Set-StrictMode -Version Latest

if (-not $env:DATABASE_URL) { $env:DATABASE_URL = 'file:./dev.db' }

Write-Output "Aplicando migrações do Prisma"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptRoot '..\..')

Set-Location ./backend

npm run migrate:prod
