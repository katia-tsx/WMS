-- Fleet bounded context: delivery vehicles and drivers. Kept separate
-- from Routing (0007), which schedules *when* a vehicle/driver pair
-- goes where — this migration only owns what a vehicle/driver *is*.

CREATE TABLE IF NOT EXISTS wms.vehicles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate  text NOT NULL UNIQUE,
  vehicle_type   text NOT NULL CHECK (vehicle_type IN ('van', 'box_truck', 'truck')),
  capacity_kg    numeric(10, 2) NOT NULL CHECK (capacity_kg > 0),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_vehicles_set_updated_at
  BEFORE UPDATE ON wms.vehicles
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_vehicles_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.vehicles
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

CREATE TABLE IF NOT EXISTS wms.drivers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Optional: a driver may or may not also have an application login:
  -- SET NULL rather than RESTRICT/CASCADE so removing that login
  -- doesn't erase the driver's own employment/license record.
  user_id        uuid REFERENCES wms.users (id) ON DELETE SET NULL,
  full_name      text NOT NULL,
  license_number text NOT NULL UNIQUE,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON wms.drivers (user_id);

CREATE TRIGGER trg_drivers_set_updated_at
  BEFORE UPDATE ON wms.drivers
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_drivers_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.drivers
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();
