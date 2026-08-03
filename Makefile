.PHONY: db-up db-down db-reset db-logs

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
