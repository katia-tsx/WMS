# Database migrations

Versioned SQL migrations for the full relational schema, applied on top of
the database [`infra/postgres/init/`](../postgres/init) bootstraps (the
`wms` schema, the `wms_app`/`wms_readonly` roles, and the
`uuid-ossp`/`pgcrypto`/`postgis` extensions — see that folder's own
comments). If you're pointing this at a database *not* provisioned by this
repo's `docker-compose.yml` (a managed Postgres/Supabase project, say),
run `infra/postgres/init/01-extensions.sql` and `02-schema.sql` against it
first; you can skip `03-roles.sh` if that database already has its own
role model.

## Why a plain SQL runner instead of node-pg-migrate

Either is a reasonable choice; this repo picks the plain runner
([`migrate.sh`](migrate.sh)) for reasons consistent with how the rest of
it is built:

- **Zero new dependencies.** `node-pg-migrate` needs itself, `pg` (the
  Postgres client library), and a Node runtime with a `DATABASE_URL` it
  can reach directly. This repo's local Postgres already only exists
  inside `docker-compose.yml` (see [`docs/database-setup.md`](../../docs/database-setup.md))
  — `migrate.sh` reuses that with `docker compose exec`, so there's
  nothing extra to install, matching the project's `package.json`, which
  to date has exactly one dependency (`eslint`).
- **Consistent with how this codebase already treats infrastructure.**
  The DI container ([`infrastructure/di/Container.js`](../../infrastructure/di/Container.js))
  and the event bus ([`infrastructure/events/EventBus.js`](../../infrastructure/events/EventBus.js))
  are both hand-rolled rather than pulled in from npm, specifically so
  the mechanism is fully visible rather than a black box. The same
  reasoning applies here: `migrate.sh` is ~90 lines, and every migration
  is plain, portable SQL — nothing depends on a tool-specific DSL.
- **The migration files themselves are 100% portable.** Numbered,
  paired `.sql`/`.down.sql` files are exactly what `node-pg-migrate`'s own
  SQL-mode migrations look like — adopting it later (e.g. once the team
  needs its richer CLI, or migration templates, or non-Docker CI
  environments) is a matter of pointing it at this same folder, not
  rewriting any SQL.

What you'd give up: `node-pg-migrate`'s CLI ergonomics (`migrate create
<name>` scaffolding, dry-run diffing) and its wider adoption/support.
Neither matters much at this repo's current size; revisit if the team or
the schema's rate of change grows significantly.

## Naming convention

```
NNNN_verb_description.sql        -- "up": what to apply
NNNN_verb_description.down.sql   -- "down": how to undo it, documented at the top
```

`NNNN` is a zero-padded, strictly increasing 4-digit number — sorts
correctly with a plain filename sort, which is also the order `migrate.sh`
applies (ascending) and rolls back (descending) in. Numbers are
foundational-dependency order, not bounded-context alphabetical order —
e.g. `0001` (shared trigger functions + `audit_logs`) has to exist before
anything can attach a trigger to it, and `0003` (auth's `users` table) has
to exist before `0004`'s `orders.placed_by` can reference it.

| Migration | Creates |
|---|---|
| `0001_create_shared_functions_and_audit_log.sql` | `wms.set_updated_at()`, `wms.audit_logs`, `wms.audit_row()` — the two trigger functions every later migration attaches per-table. |
| `0002_create_inventory_tables.sql` | `warehouses`, `locations` (bin/aisle/shelf hierarchy), `products`, `stock_items`. |
| `0003_create_auth_tables.sql` | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`. |
| `0004_create_orders_tables.sql` | `orders`, `order_lines`. |
| `0005_create_shipments_tables.sql` | `shipments`, `shipment_items`. |
| `0006_create_fleet_tables.sql` | `vehicles`, `drivers`. |
| `0007_create_routing_tables.sql` | `routes`, `route_stops`. |

Analytics, Notifications, and Voice AI have no migration yet: those
bounded contexts have no entities in `domain/` either (still `.gitkeep`
scaffolds — see [ARCHITECTURE.md](../../ARCHITECTURE.md)), and inventing
table shapes ahead of a concrete entity would just mean redesigning them
later. Add `0008_...` etc. following this same convention once they do.

## Every table gets the same two triggers

Per the compliance/eventual-consistency rules already established for
this project (see ARCHITECTURE.md §9), every business table created here
gets:

1. `BEFORE UPDATE ... EXECUTE FUNCTION wms.set_updated_at()` — stamps
   `updated_at` on every row update; application code never sets it
   itself.
2. `AFTER INSERT OR UPDATE OR DELETE ... EXECUTE FUNCTION wms.audit_row()`
   — writes one row to `wms.audit_logs` per change, with the full
   before/after row as `jsonb` (redacting `password_hash` for `users` —
   see `0003`'s comments). `audit_logs` itself is never audited (that
   would recurse forever), and `schema_migrations` (created by
   `migrate.sh`, not a numbered migration) is tooling bookkeeping, not a
   business table, so it isn't audited either.

Junction tables (`role_permissions`, `user_roles`) have no `updated_at`
column — a link either exists or doesn't, there's nothing to update — but
are still audited, since who was granted or revoked a role/permission is
exactly the kind of thing compliance traceability is for.

## Running migrations

```bash
npm run db:migrate          # apply every pending migration   (make db-migrate)
npm run db:migrate:status   # show applied vs. pending          (make db-migrate-status)
npm run db:migrate:down     # roll back the most recent one     (make db-migrate-down)
npm run db:migrate:down -- 3  # roll back the 3 most recent ones (make db-migrate-down N=3)
```

These all require the `db` container to already be up (`npm run db:up`)
and reachable via `docker compose exec` — they run the SQL files inside
the container (mounted read-only at `/migrations`), not against a host
Postgres client.

## Rollback procedures

Every `NNNN_*.down.sql` file starts with a comment stating exactly what it
removes and whether that's destructive (most schema-only rollbacks
aren't; a few — like dropping `audit_logs` — genuinely lose data and say
so explicitly). Two rules `migrate.sh` enforces mechanically rather than
just documenting:

- **Roll back in strict reverse order.** `migrate.sh down` always takes
  the N *most recently applied* migrations from `wms.schema_migrations`
  and undoes them latest-first. You cannot accidentally roll back `0001`
  (dropping `wms.audit_row()`) while `0004`'s triggers still reference
  it — Postgres would refuse with a "depended on by" error, but you'd
  never get there: `0004`'s own down-migration already runs first and
  drops those triggers along with its tables.
- **A migration with no `.down.sql` refuses to roll back**, loudly,
  rather than silently doing nothing or guessing. So far every migration
  in this folder has one.
