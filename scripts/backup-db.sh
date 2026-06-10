#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
MYSQL_SERVICE="${MYSQL_SERVICE:-mysql}"
BACKUP_DIR="${BACKUP_DIR:-backups}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/hkeiu-${STAMP}.sql"

docker compose -f "$COMPOSE_FILE" exec -T "$MYSQL_SERVICE" sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u"$MYSQL_USER" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > "$OUT"

gzip -f "$OUT"

echo "Backup written to ${OUT}.gz"
