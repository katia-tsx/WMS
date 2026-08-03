#!/usr/bin/env bash
#
# Dedicated database roles for the WMS application, distinct from the
# postgres superuser used only for administration:
#
#   wms_app      - read/write on schema `wms`. What DATABASE_URL (see
#                  .env.example) authenticates as.
#   wms_readonly - read-only on schema `wms`, for reporting/BI tools that
#                  should never be able to write.
#
# Deliberately a shell script rather than a plain .sql file: passwords
# come from WMS_APP_PASSWORD/WMS_READONLY_PASSWORD (see docker-compose.yml
# and .env.example) so they are never hardcoded in a file committed to
# git. Files here run once, in lexical order, on the container's first
# boot (docker-entrypoint-initdb.d) — after 02-schema.sql has already
# created the `wms` schema these grants apply to.
#
# Not set -e/-u: this file is *sourced* by the postgres image's own
# entrypoint script, not executed as a separate process, so those options
# would leak into (and could break) whatever the entrypoint does next.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'wms_app') THEN
    CREATE ROLE wms_app LOGIN PASSWORD '${WMS_APP_PASSWORD}';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'wms_readonly') THEN
    CREATE ROLE wms_readonly LOGIN PASSWORD '${WMS_READONLY_PASSWORD}';
  END IF;
END
\$\$;

GRANT USAGE ON SCHEMA wms TO wms_app, wms_readonly;
GRANT CREATE ON SCHEMA wms TO wms_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA wms TO wms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA wms GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wms_app;

GRANT SELECT ON ALL TABLES IN SCHEMA wms TO wms_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA wms GRANT SELECT ON TABLES TO wms_readonly;
EOSQL
