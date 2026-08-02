# voice-ai — Domain

Bounded context: Voice interaction and session rules, independent of any specific vendor (e.g. ElevenLabs).

Scaffolded per [ARCHITECTURE.md](../../ARCHITECTURE.md): `entities/`, `value-objects/`, `services/`, `events/`. No file in this context may import from `application/` or `infrastructure/` — enforced by the `local/no-outward-imports` ESLint rule.

See [domain/inventory](../inventory) for a worked example of this pattern end to end.
