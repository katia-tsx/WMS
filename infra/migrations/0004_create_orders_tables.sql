-- Orders bounded context: customer orders and their line items.

CREATE TABLE IF NOT EXISTS wms.orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'fulfilling', 'fulfilled', 'cancelled')),
  -- Who placed it, if known — not who it's *for* (customer_name); e.g.
  -- an internal user entering a phone order on a customer's behalf.
  placed_by     uuid REFERENCES wms.users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_placed_by ON wms.orders (placed_by);

CREATE TRIGGER trg_orders_set_updated_at
  BEFORE UPDATE ON wms.orders
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.orders
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

CREATE TABLE IF NOT EXISTS wms.order_lines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES wms.orders (id) ON DELETE CASCADE,
  -- RESTRICT, not CASCADE/SET NULL: a product that has ever been
  -- ordered can't just disappear from order history if it's later
  -- deactivated/removed from the catalog.
  product_id uuid NOT NULL REFERENCES wms.products (id) ON DELETE RESTRICT,
  quantity   integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One line per product per order — additional quantity for a product
  -- already on the order updates that line's quantity, it doesn't add a
  -- second line for the same product.
  CONSTRAINT uq_order_lines_order_product UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_order_lines_product_id ON wms.order_lines (product_id);

CREATE TRIGGER trg_order_lines_set_updated_at
  BEFORE UPDATE ON wms.order_lines
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_order_lines_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.order_lines
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();
