#!/usr/bin/env bash
# Teste la migration + le seed + un scénario à deux utilisateurs sur un Postgres local.
# Usage : DATABASE_URL=postgres://postgres@localhost/postgres scripts/test-db.sh
set -euo pipefail

DB_URL="${DATABASE_URL:-postgres://postgres@localhost:5432/postgres}"
DB_NAME="duo_test_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

psql "$DB_URL" -qc "create database $DB_NAME" >/dev/null
trap 'psql "$DB_URL" -qc "drop database if exists $DB_NAME" >/dev/null' EXIT

TEST_URL="${DB_URL%/*}/$DB_NAME"
run() { psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -o /dev/null "$@"; }

run -f "$ROOT/supabase/harness/auth_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run -f "$f"; done
run -f "$ROOT/supabase/seed.sql"
run -f "$ROOT/supabase/harness/scenario.sql"
echo "✅ Base de données : migration, seed et scénario OK"
