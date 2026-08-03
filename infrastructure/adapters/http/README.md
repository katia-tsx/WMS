# adapters/http — Infrastructure

A minimal, dependency-free HTTP layer: no Express, no Fastify — just
Node's built-in `http` module plus a router and middleware convention
hand-rolled the same way this repo's DI container
([`infrastructure/di/Container.js`](../../di/Container.js)) and event bus
([`infrastructure/events/EventBus.js`](../../events/EventBus.js)) are: the
whole mechanism is visible in a few hundred lines, not a black-boxed
dependency. `npm run serve` boots it on `HTTP_PORT` (default `3000`).

## Pieces

| File | Responsibility |
|---|---|
| [`Router.js`](Router.js) | Path params (`:sku`), global + per-route middleware chains, and the single place every response gets written from — a matched route, a 404, or a mapped error. |
| [`ResultToHttpMapper.js`](ResultToHttpMapper.js) | Turns a use case's `Result` into `{ status, body }`, and any error into an [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) Problem Details body. The one place status codes are decided — no controller guesses its own. |
| [`middleware/jsonBodyParser.js`](middleware/jsonBodyParser.js) | Parses a JSON body into `req.body`; malformed JSON becomes a `ValidationError` (400), not a crash. |
| [`middleware/validateBody.js`](middleware/validateBody.js) | Validates `req.body` against a schema *before* a route handler (and so before any use case) runs. |
| [`validation/JsonSchemaValidator.js`](validation/JsonSchemaValidator.js) | The schema validator `validateBody` uses — see "Request validation" below for what it does and doesn't support. |
| [`controllers/`](controllers) | One controller per bounded context (`InventoryController`, `OrderController`, ...) — see "Controllers" below. |
| [`openapi/generateOpenApiDocument.js`](openapi/generateOpenApiDocument.js) | Builds an OpenAPI 3.0 document from the `meta` attached to each registered route. Served live at `GET /openapi.json`. |
| [`routes.js`](routes.js) | Registers every route + its `meta` on one `Router`, given already-built controllers. |
| [`createHttpServer.js`](createHttpServer.js) | The one file that touches `node:http` directly — wraps a `Router` in a real `http.Server`. |
| [`main.js`](main.js) | Process entry point (`npm run serve`). Nothing else requires it. |

## Why no Express

Express (or Fastify, Koa, ...) would work fine here — the task explicitly
permits it "if justified." It isn't needed: this API is a router, five
middleware-shaped concerns (body parsing, validation, logging via
`UseCasePipelineBuilder`, error mapping), and a handful of routes. Every
piece above is independently unit-tested without an HTTP connection at
all (`Router.test.js` uses a plain `Readable` stream and a mock `res` —
no socket), and the handful of places a *real* socket matters
(`createHttpServer.test.js`, `routes.test.js`) test that directly with
Node's own `http`/`fetch`. Adding a framework buys convenience this
codebase doesn't need yet, at the cost of another dependency in a repo
that otherwise has exactly one (`eslint`).

## Request flow

```
request → [global middleware: jsonBodyParser] → [route middleware: validateBody(schema)] → handler → response
                                                                                                 │
                                                                    controller.method(req) ──────┘
                                                                    → toHttpResponse(result) → { status, body }
```

A route `handler` is `(req) => controller.method(req)` — never `(req, res) => { res.end(...) }`. Controllers
return a plain `{ status, body }` descriptor (the exact convention already established when
`infrastructure/http/inventoryController.js` was first built, before this router existed to write
it out); `Router#handle` is the only thing that calls `res.writeHead`/`res.end`. That split is what
makes a controller — see `InventoryController.test.js` — testable with a plain object literal, no
mock stream or socket required.

## Controllers

Each controller:

1. Takes already-constructed use cases/orchestrators as constructor dependencies (built once, in `infrastructure/di/CompositionRoot.js` — a controller never `require()`s a concrete adapter or reaches into `application/ports` itself).
2. Translates `req.params`/`req.body` into the use case's input DTO shape.
3. Calls `execute(input)` (a pipeline-wrapped use case — see ARCHITECTURE.md §7/§9) or an `ApplicationService`'s own method (e.g. `OrderFulfillmentOrchestrator#fulfill`).
4. Returns `toHttpResponse(result, { instance, onOk })` — never maps errors itself.

Only `InventoryController` and `OrderController` exist today, because
only Inventory (`AdjustStockUseCase`) and the order-fulfillment workflow
(`OrderFulfillmentOrchestrator`, which itself composes `AdjustStockUseCase`
— see `application/orchestrators/`) have real use cases behind them.
`ShipmentController` and the rest are not stubbed in ahead of time —
inventing routes with no use case to call would just be dead code. Adding
one once its use case exists means:

1. `controllers/<Name>Controller.js` — same shape as `InventoryController.js`.
2. A request schema (a plain object — see `RESERVE_STOCK_SCHEMA` in `routes.js`) reused for both `validateBody` and the route's `meta.requestBody`.
3. Register it in `routes.js` with `router.<method>(path, handler, { middleware: [validateBody(schema)], meta: {...} })`.
4. Wire the controller as a new binding in `CompositionRoot.js`, and pass it into `createApiRouter({...})`.

## Request validation

`JsonSchemaValidator.js` supports a deliberately practical subset of JSON
Schema — `type`, `required`, `properties`, `additionalProperties`,
`items`/`minItems`/`maxItems`, `minLength`/`maxLength`, `minimum`/`maximum`,
`enum` — not the full Draft 7/2020-12 specification (`$ref`, `oneOf`,
conditional schemas, formats, and more all exist and aren't implemented
here). It's enough to reject a malformed request body before it reaches
`application/`, which is the actual requirement; reach for a real
implementation (`ajv`) if a route ever needs a keyword this doesn't cover.

## RFC 7807 error responses

Every error response — a mapped `Result.err`, a validation failure, an
unmatched route, or an uncaught exception — has `Content-Type:
application/problem+json` and this shape:

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "No product found for sku \"missing\".",
  "code": "NOT_FOUND",
  "instance": "/inventory/missing/reserve"
}
```

`type` is `about:blank` — RFC 7807's own sanctioned default for "no
further documentation beyond title/status" — rather than a fabricated
URL this repo doesn't publish. `code` is the same machine-readable
string `DomainError` already carries elsewhere (see
`domain/shared-kernel/errors/DomainError.js`), so a client can branch on
`code` without parsing `detail`.

For an unexpected error (anything that isn't a known `DomainError`
subclass — a genuine bug), `status` is 500 and `detail` is a generic
"An unexpected error occurred." — never the real exception message,
which could contain an internal file path or stack detail that has no
business reaching a client.

## OpenAPI

`GET /openapi.json` returns a live OpenAPI 3.0 document built from every
route's `meta` at request time — not a hand-maintained spec that drifts
from the code as routes change. `:param` path syntax is converted to
OpenAPI's `{param}` automatically (`toOpenApiPath` in
`generateOpenApiDocument.js`); everything else (`summary`, `tags`,
`parameters`, `requestBody`, `responses`) is exactly what each route
passed as `meta` in `routes.js`.
