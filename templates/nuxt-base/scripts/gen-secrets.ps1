#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Prints NUXT_SESSION_PASSWORD and NUXT_SETUP_CODE lines for .env.
.DESCRIPTION
    Only the two env lines go to the output stream, so `./scripts/gen-secrets.ps1 >> .env`
    appends exactly them. Commentary goes to the host stream.
#>
[CmdletBinding()]
param([ValidateRange(2, 12)][int]$SetupCodeGroups = 3)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$bytes = [byte[]]::new(48)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$sessionPassword = [Convert]::ToBase64String($bytes)

# No 0/O/1/I/L: the setup code is typed by hand once.
$alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
$groups = foreach ($i in 1..$SetupCodeGroups) {
    -join (1..5 | ForEach-Object {
        $alphabet[[System.Security.Cryptography.RandomNumberGenerator]::GetInt32(0, $alphabet.Length)]
    })
}
$setupCode = $groups -join '-'

# stderr, not Write-Host: from another shell the host stream lands in stdout (and in .env).
[Console]::Error.WriteLine('Add these lines to .env (changing the session password logs everyone out):')
Write-Output "NUXT_SESSION_PASSWORD=`"$sessionPassword`""
Write-Output "NUXT_SETUP_CODE=`"$setupCode`""
