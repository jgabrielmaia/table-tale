#!/usr/bin/env bash
# Migration check: migrate a throwaway Postgres, assert, roll back, assert, migrate again.
# Uses the standard PG* environment variables (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE).
# DESTRUCTIVE: wipes the public, auth and storage schemas of the target. Only point it at a disposable database.
set -euo pipefail
cd "$(dirname "$0")/.."

FIRST_COMMUNITY_VERSION=20261106000001
psql_() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

migrate() {
  local seed="$1" f v
  for f in supabase/migrations/*.sql; do
    v="$(basename "$f" | cut -d_ -f1)"
    # Round trip: the older migrations are still applied, so only re-run the community ones.
    if [ "$seed" = noseed ] && [ "$v" -lt "$FIRST_COMMUNITY_VERSION" ]; then continue; fi
    if [ "$seed" = seed ] && [ "$v" = "$FIRST_COMMUNITY_VERSION" ]; then
      echo "-- seeding pre-community data"
      psql_ -1 -f supabase/ci/seed-before-communities.sql
    fi
    echo "-- up   $(basename "$f")"
    psql_ -1 -f "$f"
  done
}

rollback() {
  local f
  for f in $(ls supabase/rollbacks/*.down.sql | sort -r); do
    echo "-- down $(basename "$f")"
    psql_ -1 -f "$f"
  done
}

echo "== fresh database"
psql_ -c "drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists storage cascade; create schema public;"
psql_ -f supabase/ci/prelude.sql

echo "== migrate (with seed data before the community migrations)"
migrate seed
psql_ -f supabase/ci/assert-migrated.sql
echo "ok: migrated"

echo "== rollback"
rollback
psql_ -f supabase/ci/assert-rolled-back.sql
echo "ok: rolled back"

echo "== migrate again (round trip)"
migrate noseed
psql_ -f supabase/ci/assert-migrated.sql
echo "ok: round trip"
