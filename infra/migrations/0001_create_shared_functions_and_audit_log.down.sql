-- Rollback for 0001_create_shared_functions_and_audit_log.sql
--
-- DESTRUCTIVE: drops wms.audit_logs, permanently deleting every
-- compliance audit record ever written. Back up that table first
-- (`COPY wms.audit_logs TO ...`) if you need to retain the audit trail.
--
-- Only safe to run once every later migration (0002+) has already been
-- rolled back: their per-table triggers reference wms.audit_row() and
-- wms.set_updated_at(), and Postgres will refuse to drop a function that
-- something else still depends on. `migrate.sh down` enforces this by
-- always rolling back in strict reverse-applied order — see
-- infra/migrations/README.md.

DROP FUNCTION IF EXISTS wms.audit_row();
DROP TABLE IF EXISTS wms.audit_logs;
DROP FUNCTION IF EXISTS wms.set_updated_at();
