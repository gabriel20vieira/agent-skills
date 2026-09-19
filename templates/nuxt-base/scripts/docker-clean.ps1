<#
.SYNOPSIS
    Removes this compose project's Docker resources only; nothing global.
.PARAMETER Images
    Also remove images built by this compose file.
.PARAMETER Volumes
    Also remove named volumes. IRREVERSIBLE DATA LOSS; asks first.
.PARAMETER All
    Images + volumes + orphans.
.PARAMETER Yes
    Skip confirmations.
#>
[CmdletBinding()]
param([switch]$Images, [switch]$Volumes, [switch]$All, [switch]$Yes)

$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($All) { $Images = $true; $Volumes = $true }

    $downArgs = @('compose', '--profile', 'tools', 'down', '--remove-orphans')
    if ($Images) { $downArgs += @('--rmi', 'local') }
    if ($Volumes) {
        $answer = if ($Yes) { 'y' } else { Read-Host 'Remove this project''s volumes? ALL DATA IS LOST [y/N]' }
        if ($answer -match '^[yYsS]') { $downArgs += '--volumes' } else { Write-Host 'Volumes kept.' }
    }

    Write-Host "-> docker $($downArgs -join ' ')" -ForegroundColor Yellow
    & docker @downArgs
    docker compose ps -a
}
finally {
    Pop-Location
}
