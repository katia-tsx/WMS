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
| `adapters/http/` | The dependency-light HTTP layer: `Router` (path params, middleware chains), driving-adapter controllers per module (e.g. `InventoryController`) that translate requests into use-case input and map `Result` back to HTTP via `ResultToHttpMapper`, and an OpenAPI 3.0 document generated from route metadata. See its own [README](infrastructure/adapters/http/README.md). |
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

## 7. The Use Case pattern and the cross-cutting pipeline

### Use cases return `Result`, never throw for expected failures

Every use case under `application/use-cases/<context>/` extends [`UseCase`](application/use-cases/UseCase.js). `UseCase` fixes `execute(input)` as a template method: it validates `input` first (if a `Validator` — see [`IValidator`](application/ports/IValidator.js) — was injected), then delegates to `handle(input)`. Concrete use cases only ever override `handle`, never `execute`, so validation can never be skipped by a subclass that forgets to call it itself.

Both `execute` and `handle` return a `Result` ([`domain/shared-kernel/result/Result.js`](domain/shared-kernel/result/Result.js)) instead of throwing: [`AdjustStockUseCase`](application/use-cases/inventory/AdjustStockUseCase.js)`.handle` returns `Result.err(NotFoundError)` for an unknown sku, `Result.err(BusinessRuleViolationError)` for insufficient stock, and `Result.ok(product)` on success. A caller inspects `.isOk` / `.match({ ok, err })`; nothing needs a try/catch for a business outcome that was always possible.

### `ApplicationService` composes multiple use cases atomically

A single use case call is a bounded, single-aggregate operation. Fulfilling an order may need several — reserve stock, create a shipment, assign a route — and all of them need to succeed or none should apply. [`ApplicationService`](application/services/ApplicationService.js) is the base class for that: its `runInTransaction(work)` begins an `IUnitOfWork`, runs `work`, commits on success, and rolls back (rethrowing) if `work` throws. [`OrderFulfillmentOrchestrator`](application/orchestrators/OrderFulfillmentOrchestrator.js) extends it, wrapping its whole per-line loop in one transaction — if line 3 of 5 fails, lines 1 and 2's reservations roll back too, not just the one that failed (proved against the real [`InMemoryUnitOfWork`](infrastructure/database/InMemoryUnitOfWork.js) in `infrastructure/di/CompositionRoot.test.js`).

### Cross-cutting concerns are decorators, not inline code

Logging, authorization, and per-use-case transactions are never written inside a use case's own `handle`. Instead, [`application/use-cases/decorators/`](application/use-cases/decorators) provides:

| Decorator | Adds |
|---|---|
| `LoggingUseCaseDecorator` | Logs start / success / failure via an injected `ILogger`. |
| `AuthorizationUseCaseDecorator` | Runs a `policy(input)` before the inner use case; denies with `Result.err(AuthorizationError)` without ever calling `handle`. |
| `TransactionalUseCaseDecorator` | Wraps *one* use case's own `IUnitOfWork` transaction (commit on `Result.ok`, rollback on `Result.err` or a throw). |

`UseCasePipelineBuilder` composes them fluently, with the *last* `.withX()` call becoming the *outermost* layer:

```js
new UseCasePipelineBuilder(adjustStockUseCase)
  .withTransaction(unitOfWork)   // innermost — only opens once authorized
  .withAuthorization(policy)     // denies before a transaction ever opens
  .withLogging(logger)           // outermost — logs both denials and successes
  .build();
```

### Controllers only ever call the pipeline

`infrastructure/di/CompositionRoot.js` builds this pipeline once per use case and hands the *pipeline*, not the bare use case, to whatever driving adapter needs it — `inventoryController` is constructed from `adjustStockUseCasePipeline`, never from `adjustStockUseCase` directly. This is a hard rule across all nine modules of the system: **a controller or UI adapter never calls a domain entity directly, and never calls a bare use case** — it only ever calls `execute(input)` on whatever the pipeline builder produced. That is what guarantees every request gets the same auditing, permission checks, and error normalization (see `infrastructure/adapters/http/ResultToHttpMapper.js`'s `statusForError`, which maps `DomainError` subclasses to HTTP status codes and every controller uses — see §10) regardless of which controller or bounded context invoked it.

The one exception is a use case composed inside an `ApplicationService` workflow (like `AdjustStockUseCase` inside `OrderFulfillmentOrchestrator`): it is injected *undecorated*, because the workflow's own shared transaction already covers it — wrapping it in its own `TransactionalUseCaseDecorator` too would open a nested transaction the simple `IUnitOfWork` here doesn't support. `CompositionRoot.js` registers both bindings (`adjustStockUseCase` and `adjustStockUseCasePipeline`) side by side, one per consumer, and documents why.

## 8. Adding a new bounded context or a new adapter

* **New use case in an existing context**: add a class under `application/use-cases/<context>/` extending `UseCase` (§7), taking whatever ports it needs — plus, optionally, an `IValidator` — as constructor arguments; register it, and a `UseCasePipelineBuilder`-wrapped version for any driving adapter to use, in `infrastructure/di/CompositionRoot.js`.
* **New adapter for an existing port** (e.g. moving from `InMemoryInventoryRepository` to Postgres): add the new class under `infrastructure/database/` implementing the same port, and change one `container.register(...)` call in the composition root. Nothing in `application/` or `domain/` changes.
* **New bounded context**: create `domain/<context>/{entities,value-objects,services,events}/`, following [`domain/inventory`](domain/inventory) as the template, then add its use cases and ports the same way inventory's were added.

## 9. The domain event bus and eventual consistency

### Aggregates record; they never publish

`Product` (and any future `AggregateRoot`) never imports an `IEventPublisher` or knows a bus exists — it only ever calls `this.addDomainEvent(...)` on itself, from inside the method whose state change is significant (`reserveStock` records `StockLevelChangedEvent` on every change, plus `StockDepletedEvent` or `LowStockThresholdBreachedEvent` when applicable — see [`Product`](domain/inventory/entities/Product.js)). This keeps `domain/` at zero infrastructure dependencies (§1) while still letting an aggregate be the one that decides *what* happened.

### Publishing happens once, only after commit

Something has to turn "an aggregate has buffered events" into "a publisher was told about them" — and it must only do so once the write that produced those events has actually persisted, never before, and never if it rolled back. [`application/events/flushDomainEvents.js`](application/events/flushDomainEvents.js) is that one function (`pullDomainEvents()` off one or more aggregates, then `eventPublisher.publishAll(...)`), and exactly two things call it, both only in their commit branch:

* **`TransactionalUseCaseDecorator`** (§7) — after `unitOfWork.commit()` succeeds for a single use case, flushes events from whatever the use case's `Result.ok` returned. Its `Result.err` and thrown-error branches roll back and return *before* ever reaching that call.
* **`ApplicationService#publishDomainEvents`** — a multi-step workflow (e.g. `OrderFulfillmentOrchestrator`) collects every aggregate its steps touched as they succeed, then calls this explicitly once `runInTransaction` has already resolved. If `runInTransaction` throws, the workflow's `catch` returns `Result.err` without ever reaching the publish call.

Both are proven in their respective test files (search for "leak" in `TransactionalUseCaseDecorator.test.js`, `ApplicationService.test.js`, and `OrderFulfillmentOrchestrator.test.js`): an aggregate can buffer events and still have its transaction roll back, and in every such case, `publishedEvents` stays empty. This is what "preventing event leakage on rollback" means concretely — not a promise, a passing assertion.

### `EventBus`: the production `IEventPublisher`

[`infrastructure/events/EventBus.js`](infrastructure/events/EventBus.js) is an in-process publish/subscribe implementation of `IEventPublisher`, wired in for `mode === 'production'` (test mode keeps the simpler recording `InMemoryEventPublisher`; development keeps `ConsoleEventPublisher` — see `infrastructure/di/CompositionRoot.js`). Subscribers register for an exact topic (`'inventory.stock-depleted'`) or a namespace wildcard (`'inventory.*'`, or `'*'` for everything), as `'sync'` (awaited, in order, before `publish()` resolves) or `'async'` (awaited too, but independently of other subscribers).

A subscriber that throws is retried with exponential backoff up to `maxRetries` times; if it still fails, it is recorded in `deadLetterQueue` and skipped — **a failing subscriber never blocks or fails another subscriber, or `publish()` itself** (proved in `EventBus.test.js`). Retrying one subscriber never causes another to be invoked more than once, and a single `publish()` call never re-invokes a subscriber beyond its own retry budget — an event is delivered to each subscriber exactly once per `publish()`, not duplicated by another subscriber's retry.

### The five cross-module events defined so far

| Event | Bounded context | Raised by |
|---|---|---|
| `StockLevelChangedEvent`, `StockDepletedEvent`, `LowStockThresholdBreachedEvent` | Inventory | `Product` (wired in now) |
| `OrderPlacedEvent` | Orders | not yet — `domain/orders` has no entities yet |
| `ShipmentDispatchedEvent` | Shipments | not yet — `domain/shipments` has no entities yet |
| `RouteOptimizedEvent` | Routing | not yet — `domain/routing` has no entities yet |

The last three exist so a subscriber can be written and tested against their shape today, ahead of the use case that will eventually raise them — the same "define the port/event before the adapter" ordering §3 and §7 already establish for ports and use cases.

## 10. The HTTP layer

[`infrastructure/adapters/http/`](infrastructure/adapters/http) is a minimal, dependency-free HTTP layer — Node's built-in `http` module plus a hand-rolled `Router` and Connect-style `(req, res, next)` middleware convention, the same "build the mechanism, don't import a framework" choice already made for the DI container (§4) and the event bus (§9). Full detail, including why Express wasn't needed, lives in [its own README](infrastructure/adapters/http/README.md); the parts that matter architecturally:

* **Controllers stay framework-agnostic.** A route handler is `(req) => controller.method(req)`, and a controller returns a plain `{ status, body }` descriptor — it never touches `res`. Only `Router#handle` (and, over a real socket, `createHttpServer.js`) writes a response. This is the same shape `infrastructure/http/inventoryController.js` used before this router existed to call it, carried forward rather than redesigned.
* **`ResultToHttpMapper.js` centralizes error → status mapping**, so every controller normalizes a `Result.err` the same way (400/403/404/409/422, falling back to 500 for anything that isn't a recognized `DomainError`) instead of each guessing independently — the same "error normalization" cross-cutting concern §7 already established, now with one implementation instead of one per controller.
* **Validation happens before the application layer ever sees a request.** `validateBody(schema)` middleware — built on a small, deliberately partial `JsonSchemaValidator` (see the README for exactly what subset it supports) — runs ahead of the route handler; a malformed body never reaches a use case's own `handle`.
* **Errors are RFC 7807 Problem Details**, with `type: 'about:blank'` (the spec's own sanctioned default) rather than a fabricated documentation URL, and a redacted `detail` for anything that maps to 500 — an unexpected error's real message might contain internal detail a client has no business seeing.
* **OpenAPI is generated, not hand-written.** `GET /openapi.json` builds a live OpenAPI 3.0 document from the `meta` attached to each route in `routes.js`, so the spec can't drift from what's actually registered.
* **Only `InventoryController` and `OrderController` exist**, because only Inventory and order fulfillment have real use cases behind them — see the README for the checklist to add a new module's controller once its use case exists, rather than this section listing endpoints nothing backs yet.
