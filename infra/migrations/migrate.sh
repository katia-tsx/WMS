#!/usr/bin/env bash
#
# Plain SQL migration runner — see infra/migrations/README.md for why this
# was chosen over node-pg-migrate. Applies/rolls back numbered .sql files
# in this directory against the `db` service defined in docker-compose.yml,
# tracking what has been applied in wms.schema_migrations (created here on
# first use, not as a numbered migration itself — every migration tool
# needs to bootstrap its own bookkeeping table somehow, and there's no
# earlier migration for it to live in).
#
# Usage:
#   infra/migrations/migrate.sh up             apply every pending migration, in order
#   infra/migrations/migrate.sh down [N]        roll back the N most recently applied migrations (default 1)
#   infra/migrations/migrate.sh status          list applied vs. pending migrations
#
# Assumes infra/postgres/init/ has already run against this database (see
# docker-compose.yml) — the `wms` schema and required extensions already
# exist by the time these migrations run; see README.md for what to do if
# you're pointing this at a database not provisioned by this repo's
# docker-compose.

set -euo pipefail

# Git Bash for Windows otherwise rewrites the /migrations/... path
# arguments below into a Windows path before docker.exe (a native,
# non-MSYS binary) ever sees them, since it can't tell those are meant
# as paths *inside* the container. No effect on Linux/macOS bash — this
# variable only means something to Git Bash/MSYS.
export MSYS_NO_PATHCONV=1

MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_SERVICE="db"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-wms}"

# < /dev/null: without it, `docker compose exec` inherits whatever fd 0
# happens to be — including a process-substitution pipe a caller further
# up might be reading from — and can silently steal input meant for a
# `while read` loop higher up the call stack. None of these invocations
# need stdin themselves (-c/-f only), so it's always safe to sever it.
psql_exec() {
  docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" "$@" < /dev/null
}

ensure_tracking_table() {
  psql_exec -c "CREATE TABLE IF NOT EXISTS wms.schema_migrations (id serial PRIMARY KEY, name text UNIQUE NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());" >/dev/null
}

is_applied() {
  local name="$1"
  local result
  result="$(psql_exec -t -A -c "SELECT 1 FROM wms.schema_migrations WHERE name = '$name';")"
  [ -n "$result" ]
}

# Populates the UP_MIGRATIONS array (oldest first, .down.sql pairs
# excluded) via plain iteration into a real array — not a function that
# `echo`s names for a caller to `< <(...)` into a `while read` loop. That
# pattern looks equivalent but isn't: any command run inside the loop
# body that touches stdin (as `docker compose exec` can, even with -T,
# in some shells/environments) can silently truncate the process
# substitution, so later iterations never run and the failure is silent.
declare -a UP_MIGRATIONS=()
list_up_migrations() {
  UP_MIGRATIONS=()
  local f base
  for f in "$MIGRATIONS_DIR"/[0-9]*.sql; do
    [ -e "$f" ] || continue
    base="$(basename "$f" .sql)"
    case "$base" in
      *.down) continue ;;
      *) UP_MIGRATIONS+=("$base") ;;
    esac
  done
}

cmd_status() {
  ensure_tracking_table
  echo "Applied:"
  psql_exec -t -c "SELECT '  ' || name || '  (' || applied_at || ')' FROM wms.schema_migrations ORDER BY name;"

  echo "Pending:"
  list_up_migrations
  local base
  for base in "${UP_MIGRATIONS[@]}"; do
    if ! is_applied "$base"; then
      echo "  $base"
    fi
  done
}

cmd_up() {
  ensure_tracking_table
  list_up_migrations
  local base applied_any=false
  for base in "${UP_MIGRATIONS[@]}"; do
    if is_applied "$base"; then
      continue
    fi
    echo "Applying $base ..."
    psql_exec -f "/migrations/$base.sql"
    psql_exec -c "INSERT INTO wms.schema_migrations (name) VALUES ('$base');" >/dev/null
    applied_any=true
  done

  if [ "$applied_any" = false ]; then
    echo "Nothing to apply — already up to date."
  else
    echo "Done."
  fi
}

cmd_down() {
  local steps="${1:-1}"
  ensure_tracking_table

  local names_raw
  names_raw="$(psql_exec -t -A -c "SELECT name FROM wms.schema_migrations ORDER BY name DESC LIMIT $steps;")"

  if [ -z "$names_raw" ]; then
    echo "Nothing to roll back."
    return 0
  fi

  # Read into an array up front (same reasoning as list_up_migrations
  # above) rather than piping into a `while read` loop that will itself
  # call psql_exec.
  local -a to_rollback=()
  local line
  while IFS= read -r line; do
    [ -n "$line" ] && to_rollback+=("$line")
  done <<<"$names_raw"

  local base down_file
  for base in "${to_rollback[@]}"; do
    down_file="$MIGRATIONS_DIR/$base.down.sql"
    if [ ! -f "$down_file" ]; then
      echo "Missing $down_file — cannot roll back $base automatically." >&2
      echo "See the header comment in $MIGRATIONS_DIR/$base.sql for manual rollback steps." >&2
      exit 1
    fi
    echo "Rolling back $base ..."
    psql_exec -f "/migrations/$base.down.sql"
    psql_exec -c "DELETE FROM wms.schema_migrations WHERE name = '$base';" >/dev/null
  done

  echo "Done."
}

main() {
  local command="${1:-}"
  case "$command" in
    up) cmd_up ;;
    down) cmd_down "${2:-1}" ;;
    status) cmd_status ;;
    *)
      echo "Usage: $0 {up|down [N]|status}" >&2
      exit 1
      ;;
  esac
}

main "$@"
