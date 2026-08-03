-- Auth bounded context: application-level users and RBAC (roles,
-- permissions). Note the naming collision to be aware of: wms.roles
-- (this table) is an application concept ("warehouse_manager", "driver",
-- ...); it has nothing to do with Postgres cluster-level ROLE objects
-- like wms_app/wms_readonly (see infra/postgres/init/03-roles.sh) —
-- those are login credentials for connecting to the database at all,
-- these are business permissions once you're in.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wms.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  full_name     text NOT NULL,
  password_hash text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness (alice@example.com and Alice@Example.com
-- are the same account) without adding the citext extension.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON wms.users (lower(email));

CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON wms.users
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.users
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();
-- password_hash is redacted from the audit trail by wms.audit_row()
-- itself (see 0001) — never the plaintext password, but a hash is still
-- not something a compliance log needs to retain.

-- ---------------------------------------------------------------------------
-- roles / permissions (RBAC)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wms.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_roles_set_updated_at
  BEFORE UPDATE ON wms.roles
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.roles
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

CREATE TABLE IF NOT EXISTS wms.permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- dot-namespaced, e.g. 'inventory.adjust_stock', 'orders.create' —
  -- mirrors the domain-event eventType convention (ARCHITECTURE.md §9).
  code        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_permissions_set_updated_at
  BEFORE UPDATE ON wms.permissions
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.permissions
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

-- ---------------------------------------------------------------------------
-- junction tables: no updated_at (a link either exists or doesn't —
-- there's no other column to update), but still audited: who was
-- granted or revoked a role/permission is exactly what compliance
-- traceability is for.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wms.role_permissions (
  role_id       uuid NOT NULL REFERENCES wms.roles (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES wms.permissions (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TRIGGER trg_role_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.role_permissions
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

CREATE TABLE IF NOT EXISTS wms.user_roles (
  user_id    uuid NOT NULL REFERENCES wms.users (id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES wms.roles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON wms.user_roles (role_id);

CREATE TRIGGER trg_user_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.user_roles
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();
