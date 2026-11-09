#!/bin/sh
# Scheduled pg_dump for the compose stack (profile "backup"). Runs inside postgres:17-alpine.
# BACKUP_INTERVAL_SECONDS (default 21600 = 6h), BACKUP_KEEP (default 28 dumps), dumps go to /backups.
set -eu
interval="${BACKUP_INTERVAL_SECONDS:-21600}"
keep="${BACKUP_KEEP:-28}"
while :; do
  file="/backups/${PGDATABASE}-$(date -u +%Y%m%dT%H%M%SZ).dump"
  if pg_dump --format=custom --no-owner --file="$file.tmp"; then
    # A dump only counts once pg_restore can read its table of contents.
    if pg_restore --list "$file.tmp" > /dev/null; then
      mv "$file.tmp" "$file"; echo "backup ok: $file"
    else
      rm -f "$file.tmp"; echo "backup unreadable, discarded" >&2
    fi
  else
    rm -f "$file.tmp"; echo "pg_dump failed" >&2
  fi
  ls -1t /backups/*.dump 2>/dev/null | tail -n +"$((keep + 1))" | xargs -r rm -f --
  sleep "$interval"
done
