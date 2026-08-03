-- Rollback for 0004_create_orders_tables.sql
--
-- DESTRUCTIVE: drops every order and order line. Back up wms.orders and
-- wms.order_lines first if you need to retain order history.
--
-- Only safe once 0005 (shipments, which reference orders/order_lines)
-- has already been rolled back.

DROP TABLE IF EXISTS wms.order_lines;
DROP TABLE IF EXISTS wms.orders;
