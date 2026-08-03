-- Rollback for 0006_create_fleet_tables.sql
--
-- DESTRUCTIVE: drops every vehicle and driver record. Back up
-- wms.vehicles and wms.drivers first if you need to retain them.
--
-- Only safe once 0007 (routes references vehicles/drivers) has already
-- been rolled back.

DROP TABLE IF EXISTS wms.drivers;
DROP TABLE IF EXISTS wms.vehicles;
