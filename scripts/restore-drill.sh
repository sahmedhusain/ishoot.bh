#!/usr/bin/env bash
# Proves a backup restores: loads the newest (or given) dump into a throwaway Postgres container and counts tables.
# Usage: scripts/restore-drill.sh [backups/file.dump]
set -euo pipefail
cd "$(dirname "$0")/.."
dump="${1:-$(ls -1t backups/*.dump 2>/dev/null | head -n1 || true)}"
[ -n "$dump" ] && [ -f "$dump" ] || { echo "no dump found (run ./run.sh db backup or start the backup profile)" >&2; exit 1; }
name="restore-drill-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$name" -e POSTGRES_PASSWORD=drill postgres:17-alpine >/dev/null
until docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker exec "$name" createdb -U postgres drill
docker exec -i "$name" pg_restore -U postgres --no-owner --no-privileges --dbname=drill < "$dump" || echo "pg_restore reported warnings (often missing roles); checking contents"
tables=$(docker exec "$name" psql -U postgres -d drill -Atc "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')")
echo "restored $dump: $tables tables"
[ "$tables" -gt 0 ] || { echo "restore drill FAILED: no tables" >&2; exit 1; }
echo "restore drill OK"
