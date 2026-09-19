<#
.SYNOPSIS
    Dumps the compose database to backups/backup-<timestamp>.sql.
.DESCRIPTION
    Dumps inside the container and copies the file out, so PowerShell never re-encodes it.
    Restore: Get-Content file.sql -Raw | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
#>
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    New-Item -ItemType Directory -Force backups | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $inner = "/tmp/backup-$stamp.sql"
    docker compose exec -T db sh -c "mysqldump -uroot -p`"`$MYSQL_ROOT_PASSWORD`" --single-transaction --routines --triggers `"`$MYSQL_DATABASE`" > $inner"
    docker compose cp "db:$inner" "backups/backup-$stamp.sql"
    docker compose exec -T db rm -f $inner
    Write-Host "Saved backups/backup-$stamp.sql" -ForegroundColor Green
}
finally {
    Pop-Location
}
