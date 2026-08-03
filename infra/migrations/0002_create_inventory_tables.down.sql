-- Rollback for 0002_create_inventory_tables.sql
--
-- DESTRUCTIVE: drops stock_items, products, locations, and warehouses,
-- permanently deleting all inventory data (quantities, lot/batch
-- records, the location hierarchy, and product catalog). Back up any of
-- these you need to keep before running this.
--
-- Order matters: stock_items references products and locations;
-- locations references warehouses (and itself), and its own
-- trg_locations_enforce_hierarchy trigger depends on
-- wms.enforce_location_hierarchy() — that function has to be dropped
-- *after* wms.locations (dropping a table drops its triggers with it),
-- not before, or Postgres refuses with "other objects depend on it".

DROP TABLE IF EXISTS wms.stock_items;
DROP TABLE IF EXISTS wms.products;
DROP TABLE IF EXISTS wms.locations;
DROP FUNCTION IF EXISTS wms.enforce_location_hierarchy();
DROP TABLE IF EXISTS wms.warehouses;
