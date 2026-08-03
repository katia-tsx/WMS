-- Routing bounded context: a planned route for a vehicle/driver, and its
-- ordered delivery stops (each stop delivers one shipment). See
-- IRoutingEngine (application/ports/IRoutingEngine.js) and
-- RouteOptimizedEvent (domain/routing/events) — this is the storage a
-- future PlanRouteUseCase would persist to.

CREATE TABLE IF NOT EXISTS wms.routes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- SET NULL, not RESTRICT: a completed route is a historical record
  -- that should survive a vehicle being decommissioned or a driver
  -- leaving.
  vehicle_id             uuid REFERENCES wms.vehicles (id) ON DELETE SET NULL,
  driver_id              uuid REFERENCES wms.drivers (id) ON DELETE SET NULL,
  status                 text NOT NULL DEFAULT 'planned'
                           CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  total_distance_meters  numeric(12, 2) CHECK (total_distance_meters >= 0),
  planned_at             timestamptz NOT NULL DEFAULT now(),
  started_at             timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_routes_completed_after_started
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON wms.routes (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON wms.routes (driver_id);

CREATE TRIGGER trg_routes_set_updated_at
  BEFORE UPDATE ON wms.routes
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_routes_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.routes
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();

CREATE TABLE IF NOT EXISTS wms.route_stops (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      uuid NOT NULL REFERENCES wms.routes (id) ON DELETE CASCADE,
  -- RESTRICT: a shipment's delivery-stop history shouldn't vanish out
  -- from under a route just because the shipment record changes.
  shipment_id   uuid NOT NULL REFERENCES wms.shipments (id) ON DELETE RESTRICT,
  stop_sequence integer NOT NULL CHECK (stop_sequence > 0),
  coordinates   geography(Point, 4326),
  arrived_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Stop order within a route is unambiguous ...
  CONSTRAINT uq_route_stops_route_sequence UNIQUE (route_id, stop_sequence),
  -- ... and a shipment appears at most once per route.
  CONSTRAINT uq_route_stops_route_shipment UNIQUE (route_id, shipment_id)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_shipment_id ON wms.route_stops (shipment_id);

CREATE TRIGGER trg_route_stops_set_updated_at
  BEFORE UPDATE ON wms.route_stops
  FOR EACH ROW EXECUTE FUNCTION wms.set_updated_at();

CREATE TRIGGER trg_route_stops_audit
  AFTER INSERT OR UPDATE OR DELETE ON wms.route_stops
  FOR EACH ROW EXECUTE FUNCTION wms.audit_row();
