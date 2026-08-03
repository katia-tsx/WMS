'use strict';

const { Container } = require('./Container');
const { loadEnvFile, getRuntimeMode } = require('../config/env');
const { loadConfig } = require('../config/Config');

const { AdjustStockUseCase } = require('../../application/use-cases/inventory/AdjustStockUseCase');
const { AdjustStockInputValidator } = require('../../application/use-cases/inventory/AdjustStockInputValidator');
const { OrderFulfillmentOrchestrator } = require('../../application/orchestrators/OrderFulfillmentOrchestrator');
const { UseCasePipelineBuilder } = require('../../application/use-cases/decorators/UseCasePipelineBuilder');

const { InMemoryInventoryRepository } = require('../database/InMemoryInventoryRepository');
const { PostgresInventoryRepository } = require('../database/PostgresInventoryRepository');
const { InMemoryUnitOfWork } = require('../database/InMemoryUnitOfWork');
const { PostgresUnitOfWork } = require('../database/PostgresUnitOfWork');
const { ConsoleEventPublisher } = require('../events/ConsoleEventPublisher');
const { InMemoryEventPublisher } = require('../events/InMemoryEventPublisher');
const { EventBus } = require('../events/EventBus');
const { ConsoleLogger } = require('../logging/ConsoleLogger');
const { InMemoryLogger } = require('../logging/InMemoryLogger');
const { StructuredLogger } = require('../logging/StructuredLogger');
const { MetricsRegistry } = require('../observability/MetricsRegistry');
const { createInventoryController } = require('../adapters/http/controllers/InventoryController');
const { createOrderController } = require('../adapters/http/controllers/OrderController');
const { createHealthController } = require('../adapters/http/controllers/HealthController');
const { createApiRouter } = require('../adapters/http/routes');
const { createHttpServer } = require('../adapters/http/createHttpServer');

/**
 * CompositionRoot is the one file in the whole system allowed to import
 * both application/ (use cases, ports) and concrete infrastructure/
 * adapters and wire them together — see ARCHITECTURE.md §2 and §4.
 * Every binding below is registered by name against a `Container` (see
 * ./Container); a use case never `require()`s a concrete adapter itself,
 * it only receives whatever the container resolves for its port's name.
 *
 * Which concrete adapter backs a given port is switched by `mode`
 * (`RUNTIME_MODE`, falling back to `NODE_ENV`, defaulting to
 * "development" — see infrastructure/config/env.js): "production" wires
 * real (or, until they're built, honestly-stubbed) infrastructure;
 * anything else wires in-memory adapters, so both the app and its tests
 * run with zero external services.
 *
 * Two bindings exist for AdjustStockUseCase, on purpose:
 *  - `adjustStockUseCase` — the bare use case, with only its input
 *    validator attached. It has no `eventPublisher` at all: it never
 *    publishes anything, it only lets `Product` (an AggregateRoot) buffer
 *    events on itself via `addDomainEvent`. `orderFulfillmentOrchestrator`
 *    composes it directly, because a use case composed into an
 *    ApplicationService workflow must not open its own nested transaction
 *    — the workflow's own shared `unitOfWork` already covers it (see
 *    application/services/ApplicationService.js), and the workflow
 *    flushes those buffered events itself, once, after it commits.
 *  - `adjustStockUseCasePipeline` — the same use case wrapped in the
 *    full cross-cutting pipeline (transaction, authorization, logging;
 *    see UseCasePipelineBuilder). `withTransaction` is given the
 *    `eventPublisher` too, so this is the layer that actually flushes and
 *    publishes the aggregate's buffered events — only once its own
 *    transaction has committed (see TransactionalUseCaseDecorator).
 *    This is the one `inventoryController` is given: a controller only
 *    ever calls a pipeline-wrapped use case, never the bare one and
 *    never a domain entity — see ARCHITECTURE.md §9.
 *
 * @param {{ mode?: string }} [options]
 * @returns {Container}
 */
function buildContainer({ mode = getRuntimeMode() } = {}) {
  loadEnvFile();
  const container = new Container();

  container.register('config', () => loadConfig({ mode }), { lifetime: 'singleton' });

  container.register(
    'inventoryRepository',
    (c) => {
      if (mode === 'production') {
        return new PostgresInventoryRepository({ connectionString: c.resolve('config').databaseUrl });
      }
      return new InMemoryInventoryRepository();
    },
    { lifetime: 'singleton' },
  );

  container.register(
    'unitOfWork',
    (c) => {
      if (mode === 'production') {
        return new PostgresUnitOfWork({ connectionString: c.resolve('config').databaseUrl });
      }
      return new InMemoryUnitOfWork([c.resolve('inventoryRepository').products]);
    },
    { lifetime: 'singleton' },
  );

  container.register(
    'eventPublisher',
    (c) => {
      if (mode === 'production') {
        // EventBus is the real pub/sub adapter: subscribers (possibly in
        // other bounded contexts) register for a topic and are retried
        // with backoff on failure, independently of each other and of
        // whatever published the event. This catch-all subscriber gives
        // production the same "see every event" visibility
        // ConsoleEventPublisher gives development, without losing the
        // fan-out/retry/dead-letter behavior a real deployment needs.
        const eventBus = new EventBus();
        const logger = c.resolve('logger');
        eventBus.subscribe(
          '*',
          (event) => logger.info(`Domain event published: ${event.eventType}`, { eventId: event.eventId }),
          { mode: 'async' },
        );
        return eventBus;
      }
      if (mode === 'test') {
        return new InMemoryEventPublisher();
      }
      return new ConsoleEventPublisher();
    },
    { lifetime: 'singleton' },
  );

  container.register(
    'logger',
    () => {
      if (mode === 'production') {
        // Structured JSON — one object per line, traceId included
        // automatically (see infrastructure/logging/CorrelationContext.js)
        // — is what a real log aggregator parses; ConsoleLogger's
        // human-readable format is for a developer reading a terminal.
        return new StructuredLogger();
      }
      if (mode === 'test') {
        return new InMemoryLogger();
      }
      return new ConsoleLogger();
    },
    { lifetime: 'singleton' },
  );

  // Mode-independent (unlike most bindings above): metrics collection is
  // cheap, has no external dependency, and is just as useful for
  // introspection in development/test as it is in production, so there
  // is no in-memory-vs-real adapter split here the way there is for the
  // database or event bus.
  container.register('metricsRegistry', () => new MetricsRegistry(), { lifetime: 'singleton' });

  container.register(
    'adjustStockUseCase',
    (c) =>
      new AdjustStockUseCase({
        inventoryRepository: c.resolve('inventoryRepository'),
        validator: new AdjustStockInputValidator(),
      }),
    { lifetime: 'singleton' },
  );

  container.register(
    'adjustStockUseCasePipeline',
    (c) =>
      new UseCasePipelineBuilder(c.resolve('adjustStockUseCase'))
        .withTransaction(c.resolve('unitOfWork'), c.resolve('eventPublisher'))
        // No real actor/permission system exists yet (domain/auth is still
        // scaffolded) — this permissive policy is a placeholder so the
        // pipeline shape is real and testable now; swap in a real policy
        // once authorization exists, with no change to the controller.
        .withAuthorization(() => true, 'AdjustStockUseCase')
        .withMetrics(c.resolve('metricsRegistry'), 'AdjustStockUseCase')
        .withLogging(c.resolve('logger'), 'AdjustStockUseCase')
        .build(),
    { lifetime: 'singleton' },
  );

  container.register(
    'orderFulfillmentOrchestrator',
    (c) =>
      new OrderFulfillmentOrchestrator({
        adjustStockUseCase: c.resolve('adjustStockUseCase'),
        unitOfWork: c.resolve('unitOfWork'),
        eventPublisher: c.resolve('eventPublisher'),
      }),
    { lifetime: 'singleton' },
  );

  container.register(
    'inventoryController',
    (c) => createInventoryController({ adjustStockUseCasePipeline: c.resolve('adjustStockUseCasePipeline') }),
    { lifetime: 'singleton' },
  );

  container.register(
    'orderController',
    (c) => createOrderController({ orderFulfillmentOrchestrator: c.resolve('orderFulfillmentOrchestrator') }),
    { lifetime: 'singleton' },
  );

  container.register(
    'healthController',
    (c) =>
      createHealthController({
        inventoryRepository: c.resolve('inventoryRepository'),
        eventPublisher: c.resolve('eventPublisher'),
      }),
    { lifetime: 'singleton' },
  );

  container.register(
    'router',
    (c) =>
      createApiRouter({
        inventoryController: c.resolve('inventoryController'),
        orderController: c.resolve('orderController'),
        healthController: c.resolve('healthController'),
        metricsRegistry: c.resolve('metricsRegistry'),
      }),
    { lifetime: 'singleton' },
  );

  container.register('httpServer', (c) => createHttpServer(c.resolve('router')), { lifetime: 'singleton' });

  return container;
}

/**
 * Convenience for callers (an HTTP entry point, a CLI, a test) that just
 * want the fully wired application object, rather than resolving each
 * binding by name themselves.
 *
 * @param {{ mode?: string }} [options]
 * @returns {{
 *   container: Container,
 *   config: import('../config/Config').AppConfig,
 *   inventoryRepository: *,
 *   unitOfWork: *,
 *   eventPublisher: *,
 *   logger: *,
 *   metricsRegistry: import('../observability/MetricsRegistry').MetricsRegistry,
 *   adjustStockUseCase: AdjustStockUseCase,
 *   adjustStockUseCasePipeline: *,
 *   orderFulfillmentOrchestrator: OrderFulfillmentOrchestrator,
 *   inventoryController: *,
 *   orderController: *,
 *   healthController: *,
 *   router: import('../adapters/http/Router').Router,
 *   httpServer: import('node:http').Server,
 * }}
 */
function buildApp(options) {
  const container = buildContainer(options);
  return {
    container,
    config: container.resolve('config'),
    inventoryRepository: container.resolve('inventoryRepository'),
    unitOfWork: container.resolve('unitOfWork'),
    eventPublisher: container.resolve('eventPublisher'),
    logger: container.resolve('logger'),
    metricsRegistry: container.resolve('metricsRegistry'),
    adjustStockUseCase: container.resolve('adjustStockUseCase'),
    adjustStockUseCasePipeline: container.resolve('adjustStockUseCasePipeline'),
    orderFulfillmentOrchestrator: container.resolve('orderFulfillmentOrchestrator'),
    inventoryController: container.resolve('inventoryController'),
    orderController: container.resolve('orderController'),
    router: container.resolve('router'),
    httpServer: container.resolve('httpServer'),
  };
}

module.exports = { buildContainer, buildApp };
