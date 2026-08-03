-- Shared, cross-context foundations every later migration depends on:
-- the updated_at auto-maintenance trigger function, the audit_logs
-- table, and the generic audit trigger function that writes to it.
-- Assumes infra/postgres/init/ has already created the `wms` schema and
-- the uuid-ossp/pgcrypto/postgis extensions (see infra/migrations/README.md).

-- ---------------------------------------------------------------------------
-- updated_at auto-maintenance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wms.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION wms.set_updated_at() IS
  'BEFORE UPDATE trigger: stamps updated_at with the current time on every row update. Attached per-table by each context''s migration (e.g. 0002_create_inventory_tables.sql).';

-- ---------------------------------------------------------------------------
-- audit_logs: the compliance trail every audited table writes to
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wms.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  -- text rather than uuid: this table logs changes to tables with
  -- different primary key types (all uuid today, but the type itself
  -- shouldn't have to change if that's ever not true).
  record_id   text NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  -- Deliberately NOT a foreign key to wms.users: an audit write must
  -- never fail (or silently lose the actor) just because the acting
  -- user's account was later deleted — compliance history has to
  -- outlive the account that produced it.
  changed_by  uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON wms.audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON wms.audit_logs (created_at);

COMMENT ON TABLE wms.audit_logs IS
  'Append-only compliance trail: one row per INSERT/UPDATE/DELETE on any audited table, written by wms.audit_row(). Never audited itself (that would recurse forever).';

-- ---------------------------------------------------------------------------
-- The generic audit trigger function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wms.audit_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_record_id text;
  v_actor     uuid;
  v_old_data  jsonb;
  v_new_data  jsonb;
BEGIN
  -- Application code sets this per-connection with
  -- `SET LOCAL wms.current_user_id = '<uuid>'` before writing (see
  -- docs/database-setup.md); ad hoc psql sessions and the migration
  -- runner itself never set it, so this must degrade to NULL rather
  -- than raise.
  BEGIN
    v_actor := NULLIF(current_setting('wms.current_user_id', true), '')::uuid;
  EXCEPTION WHEN others THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
  ELSE
    v_new_data := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN
      v_old_data := to_jsonb(OLD);
    END IF;
  END IF;

  -- ->> against the jsonb form, not NEW.id/OLD.id directly: this
  -- function also runs against tables with no single `id` column (e.g.
  -- wms.role_permissions' composite primary key), and direct field
  -- access would raise "record has no field" for those. ->> just
  -- returns NULL instead, in which case fall back to the whole row as
  -- text (still a stable, unique-enough identifier for a composite key)
  -- — audit_logs.record_id is NOT NULL, so this must never resolve to
  -- NULL itself.
  v_record_id := COALESCE(v_new_data ->> 'id', v_old_data ->> 'id', COALESCE(v_new_data, v_old_data)::text);

  -- Redact sensitive columns before they ever reach the audit trail,
  -- rather than trusting every future reader of audit_logs to know not
  -- to expose them.
  IF TG_TABLE_NAME = 'users' THEN
    v_old_data := v_old_data - 'password_hash';
    v_new_data := v_new_data - 'password_hash';
  END IF;

  INSERT INTO wms.audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_actor, v_old_data, v_new_data);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION wms.audit_row() IS
  'Generic AFTER INSERT/UPDATE/DELETE trigger: writes a row to wms.audit_logs describing what changed. Attached per-table by each context''s migration.';
