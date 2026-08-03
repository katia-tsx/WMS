# Architecture

This repository is organized as **Hexagonal Architecture** (a.k.a. Ports and Adapters, Alistair Cockburn). The goal is simple to state and easy to violate without discipline: **business logic must be able to run, and be tested, without a database, a web server, a browser, or any third-party API in the room.**

## 1. The three layers

```
domain/            pure business logic — zero external dependencies
application/        use cases, orchestrators, ports (interfaces)
infrastructure/      adapters — database, HTTP, UI, third-party APIs
```

### domain/

The innermost layer. One subfolder per **bounded context**:

```
domain/
  inventory/       auth/
  orders/          fleet/
  shipments/       analytics/
  routing/         notifications/
  voice-ai/
```

Every context exposes the same four kinds of building block:

| Folder | Contains |
|---|---|
| `entities/` | Objects with identity and lifecycle that own their own invariants (e.g. `Product`, whose `reserveStock()` refuses to go negative). |
| `value-objects/` | Immutable objects defined only by their value, with no identity (e.g. `Sku`, `Quantity`). Validate themselves at construction time. |
| `services/` | Business logic that doesn't naturally belong to one entity (e.g. `StockLevelService.findProductsNeedingReorder()`). Still pure — no I/O. |
| `events/` | Plain data describing something that happened in the domain (e.g. `StockDepletedEvent`). The domain raises them; it never decides how anyone reacts. |

`domain/` imports nothing from `application/` or `infrastructure/`, and nothing from `npm` packages beyond the JS standard library. It doesn't know what a database, an HTTP request, or ElevenLabs is. This is what makes it trivially unit-testable and reusable if the delivery mechanism ever changes.

See [`domain/inventory`](domain/inventory) for a fully worked example; the other eight contexts are scaffolded with the same four subfolders, ready to be filled in the same way.

#### `domain/shared-kernel/`

Not a bounded context but the DDD **Shared Kernel**: the cross-cutting primitives every other context is built from, so identity comparison, immutability, and error handling aren't reinvented per context.

| Primitive | Purpose |
|---|---|
| `Entity` / `AggregateRoot` | Base classes for objects with identity; `AggregateRoot` adds a domain-event buffer (`addDomainEvent` / `pullDomainEvents`). |
| `ValueObject` | Base class for objects defined only by their value; enforces immutability via `Object.freeze`. |
| `DomainEvent` | Base class for "something happened" records, stamped with `eventId` and `occurredAt`. |
| `Result` / `Ok` / `Err` | An Either-style type (`map`, `flatMap`, `match`) so expected business failures are returned, not thrown. |
| `Guard` | Static invariant assertions (`againstNullOrUndefined`, `againstEmptyString`, `inRange`, `isPositiveNumber`) used in entity/value-object constructors. |
| `DomainError` hierarchy | `ValidationError`, `NotFoundError`, `ConflictError`, `BusinessRuleViolationError` — each carries a machine-readable `code` and human-readable `message`. |

Every domain object added to this repo, in any bounded context, should extend `Entity`, `AggregateRoot`, or `ValueObject` and use `Guard` for its invariants. See [`domain/shared-kernel`](domain/shared-kernel) and its unit tests (`npm test`).

### application/

The middle layer. It knows the domain exists and orchestrates it, but still knows nothing about *how* the outside world is implemented.

| Folder | Contains |
|---|---|
| `use-cases/<context>/` | One class per user-facing action (e.g. `AdjustStockUseCase`). Depends on domain entities/services directly, and on the outside world only through **ports**. |
| `ports/` | Interfaces (see §3) describing what a use case needs from the outside world — a repository, an event publisher, a voice gateway — without saying which concrete technology provides it. |
| `orchestrators/` | Coordinate multiple use cases, possibly across bounded contexts, for a single business workflow (e.g. `OrderFulfillmentOrchestrator` calling inventory, then shipments, then routing use cases in sequence). |

### infrastructure/

The outermost layer, where every concrete technology choice lives.

| Folder | Contains |
|---|---|
| `database/` | Adapters implementing repository ports (e.g. `InMemoryInventoryRepository` implementing `InventoryRepositoryPort`). |
| `http/` | Driving adapters that translate HTTP requests into use-case calls and use-case results back into HTTP responses (e.g. `inventoryController`). |
| `ui/` | The browser-facing frontend (the `index.html` / `css/` / `js/` described in the root README). |
| `third-party/` | Adapters for external APIs (e.g. `elevenLabsVoiceGateway` implementing `VoiceGatewayPort`). |

`infrastructure/di/CompositionRoot.js` is the one file allowed to import both `application/` and concrete `infrastructure/` adapters and wire them together (see §4).

## 2. The Dependency Rule

> **Source code dependencies may only point inward.**

```
infrastructure/  ──depends on──▶  application/  ──depends on──▶  domain/
   (outer)                          (middle)                     (inner)
```

Concretely:

* `domain/` depends on nothing in this repo.
* `application/` may depend on `domain/`. It must **not** depend on `infrastructure/`.
* `infrastructure/` may depend on `application/` and `domain/`.

Nothing inward-facing ever imports something from a layer further out. A `Product` entity never imports a database client; an `AdjustStockUseCase` never imports `InMemoryInventoryRepository`. This is enforced automatically — see §5.

The payoff: infrastructure is the layer most likely to change (swap Postgres for DynamoDB, swap ElevenLabs for another vendor, swap REST for GraphQL), and the Dependency Rule guarantees those changes never ripple inward into business logic.

## 3. Port vs. Adapter

* **Port** — an interface, owned by `application/`, that describes a capability the application layer needs from the outside world, expressed purely in terms the application layer cares about. Example: [`InventoryRepositoryPort`](application/ports/InventoryRepositoryPort.js) says "you can find a product by sku, save a product, and list all products" — it says nothing about SQL, connection pools, or JSON.
* **Adapter** — a concrete implementation of a port, owned by `infrastructure/`, that does the actual technical work. Example: [`InMemoryInventoryRepository`](infrastructure/database/InMemoryInventoryRepository.js) implements `InventoryRepositoryPort` with a `Map`; [`PostgresInventoryRepository`](infrastructure/database/PostgresInventoryRepository.js) implements the exact same port and is wired in for production (its query methods are still stubs pending a real driver, but `AdjustStockUseCase` would not need to change a single line once they're filled in).

The cross-cutting ports in [`application/ports`](application/ports) — `IRepository`, `ISpecification`, `IUnitOfWork`, `IEventPublisher`, `IClock`, `ILogger`, `INotificationGateway`, `IVoiceSynthesisGateway`, `IRoutingEngine` — go one step further than a `@typedef` shape: each is a class extending [`Port`](application/ports/Port.js) whose methods throw `NotImplementedError` unless a concrete adapter overrides them. A use case depends on the port, injected via its constructor, and is unit-tested by injecting an in-memory fake that extends the same port — never the real adapter. See [`application/ports/README.md`](application/ports/README.md) for the full convention.

Two kinds of adapters exist, both shown in this scaffold:

* **Driven adapters** (a.k.a. secondary/outbound) — the application layer calls *them* (repositories, gateways). `InMemoryInventoryRepository` and `ElevenLabsVoiceGateway` are driven adapters.
* **Driving adapters** (a.k.a. primary/inbound) — *they* call the application layer (HTTP controllers, CLI commands, the UI). `inventoryController` is a driving adapter.

## 4. The composition root

Something, somewhere, has to know that `AdjustStockUseCase` should be constructed with an `InMemoryInventoryRepository` rather than a `PostgresInventoryRepository`. That "something" is the **composition root**: [`infrastructure/di/CompositionRoot.js`](infrastructure/di/CompositionRoot.js). It is the single place allowed to `require()` both a use case and a concrete adapter and hand one to the other's constructor. Every other file in `application/` only ever sees the port's interface, never the adapter's implementation — this is what makes Dependency Inversion (§6) more than a diagram.

Bindings are registered by name against a small, framework-free [`Container`](infrastructure/di/Container.js) (`container.register('inventoryRepository', factory, { lifetime: 'singleton' })`) instead of being constructed inline, for three reasons:

* **Lifetimes.** A binding registered `singleton` is built once and reused; `transient` (the default) rebuilds on every `resolve()`. Repositories, publishers, and use cases are registered `singleton` so the whole graph shares one instance per process.
* **Constructor injection via factories.** A factory receives the container itself (`(c) => new AdjustStockUseCase({ inventoryRepository: c.resolve('inventoryRepository'), ... })`), so a dependency is requested by name rather than `require()`d directly — the only thing that changes to swap an adapter is which factory is registered under that name.
* **Circular dependency detection.** `Container` tracks which names are mid-resolution; if resolving `a` requires resolving `a` again before it finishes, it throws a `CircularDependencyError` naming the full cycle (e.g. `a -> b -> a`) instead of overflowing the stack.

`CompositionRoot.js` picks which adapter to register per port based on a `mode` — `RUNTIME_MODE`, falling back to `NODE_ENV`, read via [`infrastructure/config/env.js`](infrastructure/config/env.js) (which also loads a `.env` file into `process.env` if one exists, without a real environment variable ever being overridden by it). `mode === 'production'` wires `PostgresInventoryRepository` and `ConsoleEventPublisher`; anything else wires `InMemoryInventoryRepository`, and `mode === 'test'` additionally swaps in `InMemoryEventPublisher` so a test can assert on which events were published instead of reading console output.

## 5. SOLID, enforced through JSDoc-typed interfaces

This project has no TypeScript compiler, so "interfaces" are expressed as JSDoc `@typedef`s and checked two ways:

1. **Statically, via `jsconfig.json`** (`checkJs: true`). Any editor with the TypeScript language server (VS Code out of the box), or `npx tsc --noEmit` in CI, will type-check plain `.js` files against these JSDoc typedefs — flagging a call to `inventoryRepository.findBySku()` with the wrong argument type, or a class that claims `@implements {InventoryRepositoryPort}` but is missing a method.
2. **Structurally, at the architecture level, via ESLint** (§6) — which does not check method signatures, but guarantees the *files* that would need to satisfy a port are never bypassed by a direct import across layers.

How the two SOLID principles most relevant to ports-and-adapters map onto this:

* **Dependency Inversion Principle** — high-level modules (`application/use-cases/*`) must not depend on low-level modules (`infrastructure/*`); both depend on abstractions (`application/ports/*`). Concretely: `AdjustStockUseCase` takes an `InventoryRepositoryPort`-shaped object in its constructor (documented with `@param {InventoryRepositoryPort}`) and never `require()`s anything under `infrastructure/`. The concrete `InMemoryInventoryRepository` is handed to it from outside, by the composition root.
* **Interface Segregation Principle** — ports are kept narrow and single-purpose rather than one god-interface. `InventoryRepositoryPort` only knows about persisting products; publishing events is a separate `EventPublisherPort`; talking to ElevenLabs is a separate `VoiceGatewayPort`. A use case depends on exactly the ports it needs, never more.

The other three principles fall out naturally from the folder structure: entities/value-objects each have one reason to change (**SRP**); new bounded contexts or new adapters are added as new files, not by editing existing ones (**OCP**); and because ports are structural JSDoc shapes rather than nominal classes, any object satisfying the shape works as a substitute (**LSP**) — `InMemoryInventoryRepository` and any future `PostgresInventoryRepository` are interchangeable everywhere an `InventoryRepositoryPort` is expected.

## 6. ESLint enforcement

[`tools/eslint-rules/no-outward-imports.js`](tools/eslint-rules/no-outward-imports.js) is a small custom ESLint rule (loaded as a local, unpublished plugin in [`eslint.config.js`](eslint.config.js)) that mechanically enforces §2. For every `.js` file under `domain/`, `application/`, or `infrastructure/`, it inspects each `import`/`require()` and resolves where it points. If a file in an inner layer imports from an outer layer — most importantly, **`domain/` importing anything from `infrastructure/`** — it reports:

```
error  Dependency rule violation: code in 'domain/' must not import from 'infrastructure/'.
Dependencies may only point inward — see ARCHITECTURE.md  local/no-outward-imports
```

The same rule also catches `application/` importing from `infrastructure/`, which is just as important: it's the difference between "the use case depends on a port" and "the use case secretly depends on Postgres."

Run it with:

```bash
npm install
npm run lint
```

## 7. Adding a new bounded context or a new adapter

* **New use case in an existing context**: add a class under `application/use-cases/<context>/`, taking whatever ports it needs as constructor arguments; register it (and its dependencies) in `infrastructure/di/CompositionRoot.js`.
* **New adapter for an existing port** (e.g. moving from `InMemoryInventoryRepository` to Postgres): add the new class under `infrastructure/database/` implementing the same port, and change one `container.register(...)` call in the composition root. Nothing in `application/` or `domain/` changes.
* **New bounded context**: create `domain/<context>/{entities,value-objects,services,events}/`, following [`domain/inventory`](domain/inventory) as the template, then add its use cases and ports the same way inventory's were added.
