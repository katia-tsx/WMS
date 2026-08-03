-- Dedicated schema for every WMS application table, kept separate from
-- the default `public` schema so ownership and grants (see
-- 03-roles.sh) can be scoped to exactly this schema rather than to
-- everything in the database.
CREATE SCHEMA IF NOT EXISTS wms;

COMMENT ON SCHEMA wms IS 'AI-powered WMS application tables (inventory, orders, shipments, routing, ...).';
