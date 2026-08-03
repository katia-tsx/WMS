-- Rollback for 0003_create_auth_tables.sql
--
-- DESTRUCTIVE: drops every user account, role, permission, and
-- role/user assignment. Back up wms.users, wms.roles, wms.permissions,
-- wms.role_permissions, and wms.user_roles first if you need to retain
-- any of them.
--
-- Only safe once any later migration referencing wms.users (orders'
-- placed_by, drivers' user_id) has already been rolled back —
-- `migrate.sh down`'s strict reverse-order rollback guarantees this.

DROP TABLE IF EXISTS wms.user_roles;
DROP TABLE IF EXISTS wms.role_permissions;
DROP TABLE IF EXISTS wms.permissions;
DROP TABLE IF EXISTS wms.roles;
DROP TABLE IF EXISTS wms.users;
