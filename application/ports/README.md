# ports — Application

Ports are interfaces, owned by `application/`, describing what a use case needs from the outside world without saying which concrete technology provides it (see [ARCHITECTURE.md §3](../../ARCHITECTURE.md)). A use case only ever depends on a port, injected through its constructor — never on a concrete `infrastructure/` class — which is what makes it unit-testable with an in-memory fake instead of a real database, message broker, or third-party API.

## The abstract-class convention

`IRepository`, `ISpecification`, `IUnitOfWork`, `IEventPublisher`, `IClock`, `ILogger`, `INotificationGateway`, `IVoiceSynthesisGateway`, and `IRoutingEngine` are written as classes extending [`Port`](Port.js), not as `@typedef` object shapes. Every port method's body is `this._abstract('methodName')`, which throws a [`NotImplementedError`](errors/NotImplementedError.js) naming the concrete class and method.

This buys one thing a pure structural typedef can't: a concrete adapter `extends` the port and overrides its methods, and if it forgets one, calling that method fails loudly the moment it's called — not silently, and not only in an editor's type-checker. Each port's JSDoc documents its contract as explicit **pre-conditions** (what the caller must guarantee) and **post-conditions** (what the port guarantees back), e.g. `IRepository#findById`: pre — `id` is non-null; post — resolves to the aggregate or `null`, never rejects for "not found".

```js
class InMemoryFooRepository extends IRepository {
  async findById(id) { /* ... */ }
  async findAll() { /* ... */ }
  async save(entity) { /* ... */ }
  async delete(id) { /* ... */ }
  async findBySpecification(spec) { /* ... */ }
}
```

A handful of methods are *not* abstract because they have one correct default built from the port's true primitive — e.g. `IEventPublisher#publishAll` just loops over `publish`, and `ISpecification#and`/`or`/`not` build composite specifications from `isSatisfiedBy`. Adapters never need to override these.

`InventoryRepositoryPort.js`, `EventPublisherPort.js`, and `VoiceGatewayPort.js` in this same folder predate this convention and are still duck-typed `@typedef`s — they are not wrong, just an earlier iteration. New ports, and any bounded-context-specific narrowing of the ones here (e.g. an `InventoryRepositoryPort` that `extends IRepository` and adds `findBySku`), should follow the class-based convention above.

## Files

| File | Port | Contract |
|---|---|---|
| `IRepository.js` | `IRepository<T>` | Generic aggregate persistence: `findById`, `findAll`, `save`, `delete`, `findBySpecification`. |
| `ISpecification.js` | `ISpecification<T>` | Composable predicate: `isSatisfiedBy`, plus `and`/`or`/`not`, decoupling domain queries from SQL. |
| `IUnitOfWork.js` | `IUnitOfWork` | Transactional boundary: `begin`, `commit`, `rollback`. |
| `IEventPublisher.js` | `IEventPublisher` | Domain-event dispatch: `publish`, `publishAll`. |
| `IClock.js` | `IClock` | Testable current time: `now`. |
| `ILogger.js` | `ILogger` | Structured logging: `debug`, `info`, `warn`, `error`. |
| `IMetricsRecorder.js` | `IMetricsRecorder` | Metrics: `incrementCounter`, `observeHistogram`. |
| `INotificationGateway.js` | `INotificationGateway` | Send a message to a human (Notifications context): `send`. |
| `IVoiceSynthesisGateway.js` | `IVoiceSynthesisGateway` | Text-to-speech (Voice AI context): `synthesizeSpeech`. |
| `IRoutingEngine.js` | `IRoutingEngine` | Route planning (Routing context): `planRoute`. |
| `Port.js` | — | Shared base class providing `_abstract(methodName)`. |
| `errors/NotImplementedError.js` | — | Thrown by `_abstract`; a programmer error, never caught by application code. |

Run the unit tests (which assert each port throws/rejects with `NotImplementedError` when not overridden, plus the `ISpecification` composition logic) with:

```bash
npm test
```
