-- Rollback for 0005_create_shipments_tables.sql
--
-- DESTRUCTIVE: drops every shipment and shipment line item, permanently
-- losing lot/batch-level fulfillment traceability. Back up
-- wms.shipments and wms.shipment_items first if you need to retain them.
--
-- Only safe once 0007 (route_stops references shipments) has already
-- been rolled back.

DROP TABLE IF EXISTS wms.shipment_items;
DROP TABLE IF EXISTS wms.shipments;
