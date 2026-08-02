# routing — Domain

Bounded context: Vehicle Routing Problem (VRP) optimization: stops, constraints, and route-cost rules for last-mile delivery.

Scaffolded per [ARCHITECTURE.md](../../ARCHITECTURE.md): `entities/`, `value-objects/`, `services/`, `events/`. No file in this context may import from `application/` or `infrastructure/` — enforced by the `local/no-outward-imports` ESLint rule.

See [domain/inventory](../inventory) for a worked example of this pattern end to end.
