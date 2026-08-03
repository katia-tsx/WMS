.PHONY: db-up db-down db-reset db-logs db-migrate db-migrate-down db-migrate-status

# Start Postgres + the local Supabase stack in the background.
# See docs/database-setup.md for first-time setup (copying .env.example to .env).
db-up:
	docker compose up -d

# Stop all services, keeping pgdata/storage-data volumes intact.
db-down:
	docker compose down

# Stop all services AND delete their volumes, so the next db-up re-runs
# infra/postgres/init/ from a completely empty database. Use this when
# you've changed an init script or just want a clean slate.
db-reset:
	docker compose down -v
	docker compose up -d

# Tail logs from every service. Pass a service name to follow just one,
# e.g. `make db-logs service=db`.
db-logs:
	docker compose logs -f $(service)

# Apply every pending migration under infra/migrations/ (see its README
# for the naming convention and why this is a plain script, not
# node-pg-migrate). Requires `make db-up` first.
db-migrate:
	bash infra/migrations/migrate.sh up

# Roll back the most recently applied migration, or the N most recent
# with `make db-migrate-down N=3`.
db-migrate-down:
	bash infra/migrations/migrate.sh down $(N)

db-migrate-status:
	bash infra/migrations/migrate.sh status
