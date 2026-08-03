# Local database & Supabase setup

This repo's local development environment is defined in
[`docker-compose.yml`](../docker-compose.yml): a PostgreSQL 16 (+ PostGIS)
instance, plus a lean self-hosted Supabase stack (Studio, Auth, Realtime,
PostgREST, Storage) for exercising Supabase-flavored features without a
hosted project.

## Prerequisites

- Docker Desktop (or another Docker Engine + Compose v2 install).
  `docker compose version` should print `v2.x` or newer.
- Nothing else — no local Postgres/Supabase CLI install required.

## Quick start

```bash
cp .env.example .env
# Edit .env: at minimum, set your own JWT_SECRET, REALTIME_SECRET_KEY_BASE,
# WMS_APP_PASSWORD, and WMS_READONLY_PASSWORD. Defaults are fine for a
# throwaway local database; see the comments in .env.example.

npm run db:up       # or: make db-up
npm run db:migrate  # or: make db-migrate   (creates every table — see "Schema & migrations" below)
npm run db:logs     # or: make db-logs      (Ctrl+C to stop following)
npm run db:down     # or: make db-down      (stops containers, keeps data)
npm run db:reset    # or: make db-reset     (wipes volumes, re-runs infra/postgres/init/ from scratch — re-run db:migrate after)
```

`db:up`/`db-up` returns as soon as containers are *started*, not
necessarily *ready* — Postgres itself takes a few seconds to accept
connections, and every other service is configured with
`depends_on: db: condition: service_healthy` (see "Health checks" below),
so they wait for it automatically. Run `docker compose ps` to see when
everything reports `healthy`/`running`.

## Services

| Service | Container | Host port | Purpose |
|---|---|---|---|
| PostgreSQL 16 + PostGIS | `db` | `5432` | Primary datastore. `wms` database and `wms` schema come from [`infra/postgres/init/`](../infra/postgres/init); its tables come from [`infra/migrations/`](../infra/migrations) (`npm run db:migrate`) — see "Schema & migrations" below. |
| Supabase Studio | `studio` | `54323` | Web UI: table editor, SQL editor, auth users. |
| Postgres Meta | `meta` | *(internal only)* | Backs Studio's table editor/schema browser — not one of the five services this environment was asked to provide, but Studio calls it directly and is unusable without it. |
| Auth (GoTrue) | `auth` | `9999` | Email/password + OAuth user management, JWT issuance. |
| PostgREST | `rest` | `3001` | Auto-generated REST API over the `wms` schema. This is what `SUPABASE_URL` points at (see "Known limitations"). |
| Realtime | `realtime` | `4000` | Postgres logical-replication change feed over WebSockets. |
| Storage | `storage` | `5000` | S3-like file storage API, backed by a local volume. |

All health/readiness gating is driven off Postgres: `db` has a
`pg_isready`-based healthcheck (5s interval, 10 retries, 10s start
period), and every other service declares
`depends_on: { db: { condition: service_healthy } }`, so Compose won't
even start them until Postgres is accepting connections.

## Environment variables

See [`.env.example`](../.env.example) for the full, commented list. The
four the application code itself cares about:

| Variable | Used for |
|---|---|
| `DATABASE_URL` | What `infrastructure/database/PostgresInventoryRepository` (and friends — see [ARCHITECTURE.md](../ARCHITECTURE.md)) connects with. Authenticates as `wms_app`, not the postgres superuser. |
| `SUPABASE_URL` | Base URL for `supabase-js` / direct REST calls. Points at PostgREST (`rest`) — see "Known limitations". |
| `SUPABASE_ANON_KEY` | The `anon` JWT — safe to ship to a browser; RLS policies (none defined yet) would gate what it can see. |
| `SUPABASE_SERVICE_ROLE_KEY` | The `service_role` JWT — full access, server-side only, never shipped to a client. |

## `infra/postgres/init/`

Everything in this folder runs exactly once, in filename order, the
*first* time the `db` container starts with an empty `pgdata` volume
(standard Postgres Docker image behavior — see
`docker-entrypoint-initdb.d` in the [Postgres image
docs](https://hub.docker.com/_/postgres)). It does **not** re-run on a
normal restart; use `npm run db:reset` to force it.

| File | Does |
|---|---|
| `01-extensions.sql` | Enables `uuid-ossp`, `pgcrypto`, and `postgis` (PostGIS ships built into the `postgis/postgis` image this compose file uses instead of plain `postgres:16`). |
| `02-schema.sql` | Creates the `wms` schema that every application table lives in. |
| `03-roles.sh` | Creates the `wms_app` (read/write) and `wms_readonly` (read-only) roles, with passwords from `WMS_APP_PASSWORD`/`WMS_READONLY_PASSWORD` — a shell script rather than a `.sql` file specifically so those passwords never end up hardcoded in a file committed to git. |

## Schema & migrations

`infra/postgres/init/` only bootstraps an *empty* `wms` schema — no
tables. Those come from [`infra/migrations/`](../infra/migrations):
versioned, numbered SQL files (`0001_create_shared_functions_and_audit_log.sql`,
`0002_create_inventory_tables.sql`, ...) covering every bounded context's
tables (`warehouses`/`locations`/`products`/`stock_items`,
`users`/`roles`/`permissions`, `orders`/`order_lines`,
`shipments`/`shipment_items`, `vehicles`/`drivers`, `routes`/`route_stops`,
plus the shared `audit_logs` compliance trail every table writes to on
INSERT/UPDATE/DELETE). Run them with `npm run db:migrate` after `db:up`
(see the commands above).

See [`infra/migrations/README.md`](../infra/migrations/README.md) for the
full table-by-table breakdown, why this repo uses a plain SQL runner
script instead of `node-pg-migrate`, and rollback procedures
(`npm run db:migrate:down`).

## Connecting with DBeaver

1. **Database > New Database Connection > PostgreSQL.**
2. Fill in the **Main** tab:

   | Field | Value |
   |---|---|
   | Host | `localhost` |
   | Port | `5432` (or your `POSTGRES_PORT`, if changed) |
   | Database | `wms` |
   | Username | `wms_app` (read/write) or `wms_readonly` (read-only) |
   | Password | whatever you set `WMS_APP_PASSWORD`/`WMS_READONLY_PASSWORD` to in `.env` |
3. On the **PostgreSQL** driver tab, leave SSL disabled (this is a local
   container, not a public endpoint).
4. **Test Connection** — DBeaver will offer to download the PostgreSQL
   driver the first time; accept that.
5. Once connected, expand `wms` (Databases > wms > Schemas > wms) rather
   than the default `public` schema to find application tables.

If "Test Connection" fails, run `docker compose ps` first — the most
common cause is `db` not being `healthy` yet, or `.env` not having been
copied from `.env.example` at all (Compose will refuse to start with a
clear "variable is required" error in that case, per the `${VAR:?...}`
guards in `docker-compose.yml`).

## Known limitations

This is a **lean, local-development** reconstruction of Supabase's
self-hosting stack, not a byte-for-byte copy of it, and it cuts two
corners deliberately:

- **No Kong API gateway.** A full Supabase deployment puts Auth, REST,
  Realtime, and Storage behind a single Kong gateway URL, routed by path
  (`/auth/v1/...`, `/rest/v1/...`, etc.) — that single URL is what
  `SUPABASE_URL` normally points at. This setup only provisions the five
  services named for it, so there is no gateway: `SUPABASE_URL` points
  directly at PostgREST instead, and Auth/Realtime/Storage are reached on
  their own ports (see the services table above). Add
  [Kong](https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml)
  in front of them if you need a single unified URL.
- **`db` is plain PostgreSQL + PostGIS, not `supabase/postgres`.** A real
  Supabase project's database image ships with Supabase's own bootstrap
  scripts that create the `auth`/`storage`/`_realtime` schemas and the
  `supabase_auth_admin`/`supabase_storage_admin`/`authenticator`/`anon`/
  `authenticated`/`service_role` roles those services expect. This
  environment only provisions what was asked of it — the `wms` schema and
  the `wms_app`/`wms_readonly` roles (see `infra/postgres/init/` above) —
  so `auth` and `storage` currently connect as the postgres superuser
  directly rather than through those dedicated roles. Signing up a user
  or uploading a file may not work until you either swap the `db` image
  for `supabase/postgres` (simplest: it already contains that bootstrap
  SQL) or add it yourself to `infra/postgres/init/`. Studio, PostgREST
  against the `wms` schema, and plain Postgres access via DBeaver all work
  as-is regardless.

## Troubleshooting

- **A service keeps restarting** — `docker compose logs -f <service>`
  (or `make db-logs service=<service>`) almost always shows why in the
  last few lines; for `auth`/`realtime`/`storage` it's usually a missing
  or malformed env var (double-check `.env` against `.env.example`).
- **"variable is required" on `db-up`** — you haven't copied `.env.example`
  to `.env` yet, or deleted a required line from it.
- **Port already in use** — something else on your machine is already
  listening on `5432`/`54323`/etc.; override the relevant `*_PORT`
  variable in `.env`.
- **Stale data after changing an init script** — init scripts only run
  once, against an empty `pgdata` volume; run `npm run db:reset` (or
  `make db-reset`) to force them to run again.
