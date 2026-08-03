-- Shipments bounded context: what actually left the warehouse for an
-- order, and which specific stock (down to the lot/batch) fulfilled it.

CREATE TABLE IF NOT EXISTS wms.shipments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES wms.orders (id) ON DELETE RESTRICT,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'packed', 'dispatched', 'delivered', 'cancelled')),
  dispatched_at  timestamptz,
  delivered_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_shipments_delivered_after_dispatched
    CHECK (delivered_at IS NULL OR dispatched_at IS NULL OR delivered_at >= dispatched_at)
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON wms.shipments (order_id);

CREATE TRIGGER trg_shipments_set_updated_at
  BEFORE UPDATE ON wms.shipments
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_shipments_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.shipments
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

CREATE TABLE IF NOT EXISTS wms.shipment_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   uuid NOT NULL REFERENCES wms.shipments (id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES wms.order_lines (id) ON DELETE RESTRICT,
  -- Which specific lot/batch, at which location, actually fulfilled this
  -- line — traceability from a shipped unit back to where it was
  -- picked, e.g. for a product recall.
  stock_item_id uuid NOT NULL REFERENCES wms.stock_items (id) ON DELETE RESTRICT,
  quantity      integer NOT NULL CHECK (quantity > 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_shipment_items_shipment_line_stock UNIQUE (shipment_id, order_line_id, stock_item_id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_items_order_line_id ON wms.shipment_items (order_line_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_stock_item_id ON wms.shipment_items (stock_item_id);

CREATE TRIGGER trg_shipment_items_set_updated_at
  BEFORE UPDATE ON wms.shipment_items
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_shipment_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.shipment_items
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();
