-- Rollback for 0007_create_routing_tables.sql
--
-- DESTRUCTIVE: drops every route and route stop, permanently losing
-- delivery-routing history. Back up wms.routes and wms.route_stops
-- first if you need to retain them.
--
-- This is the newest migration (nothing later references these tables),
-- so it's always safe to roll back on its own.

DROP TABLE IF EXISTS wms.route_stops;
DROP TABLE IF EXISTS wms.routes;
