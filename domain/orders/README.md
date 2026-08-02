# orders — Domain

Bounded context: Order lifecycle: creation, line items, status transitions, and cancellation rules.

Scaffolded per [ARCHITECTURE.md](../../ARCHITECTURE.md): `entities/`, `value-objects/`, `services/`, `events/`. No file in this context may import from `application/` or `infrastructure/` — enforced by the `local/no-outward-imports` ESLint rule.

See [domain/inventory](../inventory) for a worked example of this pattern end to end.
