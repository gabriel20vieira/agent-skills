#!/bin/sh
# Dumps the compose database to backups/backup-<timestamp>.sql.
# Restore: docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < file.sql
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
inner="/tmp/backup-$stamp.sql"
docker compose exec -T db sh -c "mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --routines --triggers \"\$MYSQL_DATABASE\" > $inner"
docker compose cp "db:$inner" "backups/backup-$stamp.sql"
docker compose exec -T db rm -f "$inner"
echo "Saved backups/backup-$stamp.sql"
