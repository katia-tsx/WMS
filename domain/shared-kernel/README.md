# shared-kernel — Domain

Not a bounded context but the DDD **Shared Kernel**: cross-cutting domain primitives that every bounded context builds on top of, so no two contexts reinvent identity comparison, immutability, or error handling differently.

| Folder | Contains |
|---|---|
| `entities/` | `Entity` (identity-based equality) and `AggregateRoot` (adds a domain-event buffer). |
| `value-objects/` | `ValueObject` — structural equality, immutable via `Object.freeze`. |
| `events/` | `DomainEvent` — base class carrying `eventId` and `occurredAt`. |
| `result/` | `Result`/`Ok`/`Err` — an Either-style type so expected business failures are returned, not thrown. |
| `guard/` | `Guard` — static invariant assertions (`againstNullOrUndefined`, `againstEmptyString`, `inRange`, `isPositiveNumber`) used in every entity/value-object constructor. |
| `errors/` | `DomainError` and its subclasses (`ValidationError`, `NotFoundError`, `ConflictError`, `BusinessRuleViolationError`), each carrying a machine-readable `code` and human-readable `message`. |

Every domain object added to this repo — in any bounded context — should extend one of `Entity`, `AggregateRoot`, or `ValueObject`, and use `Guard` for constructor invariants instead of hand-rolled `if` checks. Like every other file under `domain/`, nothing here may import from `application/` or `infrastructure/` — enforced by the `local/no-outward-imports` ESLint rule.

Run the unit tests with:

```bash
npm test
```
