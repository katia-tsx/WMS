# shipments — Domain

Bounded context: Shipment creation, carrier assignment, tracking status, and delivery confirmation rules.

Scaffolded per [ARCHITECTURE.md](../../ARCHITECTURE.md): `entities/`, `value-objects/`, `services/`, `events/`. No file in this context may import from `application/` or `infrastructure/` — enforced by the `local/no-outward-imports` ESLint rule.

See [domain/inventory](../inventory) for a worked example of this pattern end to end.
