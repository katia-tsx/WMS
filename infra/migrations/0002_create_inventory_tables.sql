-- Inventory bounded context: warehouses, their bin/aisle/shelf location
-- hierarchy, products, and the stock actually sitting in each location
-- (with lot/batch tracking). See domain/inventory (application code) —
-- application.Product currently models a single quantityOnHand per SKU;
-- stock_items is the normalized source of truth that aggregates to that
-- once a product's stock can span multiple locations/lots.

-- ---------------------------------------------------------------------------
-- warehouses
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wms.warehouses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  address     text,
  -- geography, not geometry: point coordinates on the Earth's surface,
  -- so distance/containment queries account for curvature (matters at
  -- warehouse-to-warehouse or warehouse-to-delivery-stop distances).
  coordinates geography(Point, 4326),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_warehouses_set_updated_at
  BEFORE UPDATE ON wms.warehouses
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_warehouses_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.warehouses
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

-- ---------------------------------------------------------------------------
-- locations: bin/aisle/shelf hierarchy within a warehouse
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wms.locations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id       uuid NOT NULL REFERENCES wms.warehouses (id) ON DELETE CASCADE,
  parent_location_id uuid REFERENCES wms.locations (id) ON DELETE CASCADE,
  location_type      text NOT NULL CHECK (location_type IN ('aisle', 'shelf', 'bin')),
  code               text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_locations_warehouse_code UNIQUE (warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS idx_locations_warehouse_id ON wms.locations (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent_location_id ON wms.locations (parent_location_id);

-- A CHECK constraint can't look at another row (the parent's type), so
-- the aisle -> shelf -> bin hierarchy is enforced with a trigger instead.
CREATE OR REPLACE FUNCTION wms.enforce_location_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_type text;
BEGIN
  IF NEW.location_type = 'aisle' THEN
    IF NEW.parent_location_id IS NOT NULL THEN
      RAISE EXCEPTION 'An aisle cannot have a parent location (got %)', NEW.parent_location_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_location_id IS NULL THEN
    RAISE EXCEPTION '% locations must have a parent location', NEW.location_type;
  END IF;

  SELECT location_type INTO v_parent_type FROM wms.locations WHERE id = NEW.parent_location_id;

  IF NEW.location_type = 'shelf' AND v_parent_type IS DISTINCT FROM 'aisle' THEN
    RAISE EXCEPTION 'A shelf''s parent must be an aisle, got %', v_parent_type;
  ELSIF NEW.location_type = 'bin' AND v_parent_type IS DISTINCT FROM 'shelf' THEN
    RAISE EXCEPTION 'A bin''s parent must be a shelf, got %', v_parent_type;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION wms.enforce_location_hierarchy() IS
  'Enforces the aisle -> shelf -> bin hierarchy: an aisle has no parent, a shelf''s parent must be an aisle, a bin''s parent must be a shelf.';

CREATE TRIGGER trg_locations_enforce_hierarchy
  BEFORE INSERT OR UPDATE ON wms.locations
  FOR EACH ROW EXECUTE FUNCTION wms.enforce_location_hierarchy();

CREATE TRIGGER trg_locations_set_updated_at
  BEFORE UPDATE ON wms.locations
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_locations_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.locations
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wms.products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               text NOT NULL UNIQUE,
  name              text NOT NULL,
  description       text,
  reorder_threshold integer NOT NULL DEFAULT 0 CHECK (reorder_threshold >= 0),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_products_set_updated_at
  BEFORE UPDATE ON wms.products
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_products_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.products
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

-- ---------------------------------------------------------------------------
-- stock_items: quantity of a product, at a location, per lot/batch
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wms.stock_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES wms.products (id) ON DELETE RESTRICT,
  location_id       uuid NOT NULL REFERENCES wms.locations (id) ON DELETE RESTRICT,
  -- '' (not NULL) for non-lot-tracked stock: composite UNIQUE treats
  -- every NULL as distinct, so NULL here would let duplicate
  -- product+location rows slip through the constraint below.
  lot_number        text NOT NULL DEFAULT '',
  quantity          integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  expires_at        date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_items_product_location_lot UNIQUE (product_id, location_id, lot_number),
  CONSTRAINT chk_stock_items_reserved_le_quantity CHECK (reserved_quantity <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_stock_items_product_id ON wms.stock_items (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_location_id ON wms.stock_items (location_id);

CREATE TRIGGER trg_stock_items_set_updated_at
  BEFORE UPDATE ON wms.stock_items
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_stock_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.stock_items
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();
