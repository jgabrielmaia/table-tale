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
psql_ -f supabase/ci/assert-bgg.sql
psql_ -f supabase/ci/assert-owner-achievement.sql
psql_ -f supabase/ci/assert-community-onboarding.sql
echo "ok: migrated"

# The full rollback below drops the default-community trigger again with the community schema, so prove on its own
# that undoing 20261112000004 brings the automatic join back, then re-apply it.
echo "== rollback and re-apply 20261112000004 (automatic join)"
psql_ -1 -f supabase/rollbacks/20261112000004_no_default_community_join.down.sql
psql_ -f supabase/ci/assert-default-join-restored.sql
psql_ -1 -f supabase/migrations/20261112000004_no_default_community_join.sql
psql_ -f supabase/ci/assert-community-onboarding.sql
echo "ok: automatic join rollback"

echo "== rollback"
rollback
psql_ -f supabase/ci/assert-rolled-back.sql
echo "ok: rolled back"

echo "== migrate again (round trip)"
migrate noseed
psql_ -f supabase/ci/assert-migrated.sql
psql_ -c "delete from public.games where slug = 'ci-bgg'"
psql_ -f supabase/ci/assert-bgg.sql
psql_ -f supabase/ci/assert-owner-achievement.sql
psql_ -f supabase/ci/assert-community-onboarding.sql
echo "ok: round trip"

# Contract phase (drop genre/complexity), last because dropping the columns discards the legacy values. It lives outside supabase/migrations on purpose, so it is only
# applied by hand after the new app is deployed; here we prove it applies and reverts cleanly.
echo "== contract (drop genre/complexity) and its rollback"
psql_ -1 -f supabase/contract/20261107000002_drop_genre_complexity.sql
psql_ -f supabase/ci/assert-contracted.sql
psql_ -1 -f supabase/contract/20261107000002_drop_genre_complexity.down.sql
if [ "$(psql_ -tA -c "select genre from public.games where slug = 'ci-bgg'")" != "Economic" ]; then
  echo "contract rollback did not refill genre from the BGG category" >&2
  exit 1
fi
echo "ok: contract round trip"
