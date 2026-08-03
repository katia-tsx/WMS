'use strict';

const { Container } = require('./Container');
const { loadEnvFile, getRuntimeMode } = require('../config/env');

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
const { ConsoleLogger } = require('../logging/ConsoleLogger');
const { InMemoryLogger } = require('../logging/InMemoryLogger');
const { createInventoryController } = require('../http/inventoryController');

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
 *    validator attached. `orderFulfillmentOrchestrator` composes it
 *    directly, because a use case composed into an ApplicationService
 *    workflow must not open its own nested transaction — the workflow's
 *    own shared `unitOfWork` already covers it (see
 *    application/services/ApplicationService.js).
 *  - `adjustStockUseCasePipeline` — the same use case wrapped in the
 *    full cross-cutting pipeline (transaction, authorization, logging;
 *    see UseCasePipelineBuilder). This is the one `inventoryController`
 *    is given: a controller only ever calls a pipeline-wrapped use case,
 *    never the bare one and never a domain entity — see ARCHITECTURE.md
 *    §8.
 *
 * @param {{ mode?: string }} [options]
 * @returns {Container}
 */
function buildContainer({ mode = getRuntimeMode() } = {}) {
  loadEnvFile();
  const container = new Container();

  container.register(
    'inventoryRepository',
    () => {
      if (mode === 'production') {
        return new PostgresInventoryRepository({ connectionString: process.env.DATABASE_URL });
      }
      return new InMemoryInventoryRepository();
    },
    { lifetime: 'singleton' },
  );

  container.register(
    'unitOfWork',
    (c) => {
      if (mode === 'production') {
        return new PostgresUnitOfWork({ connectionString: process.env.DATABASE_URL });
      }
      return new InMemoryUnitOfWork([c.resolve('inventoryRepository').products]);
    },
    { lifetime: 'singleton' },
  );

  container.register(
    'eventPublisher',
    () => {
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
      if (mode === 'test') {
        return new InMemoryLogger();
      }
      return new ConsoleLogger();
    },
    { lifetime: 'singleton' },
  );

  container.register(
    'adjustStockUseCase',
    (c) =>
      new AdjustStockUseCase({
        inventoryRepository: c.resolve('inventoryRepository'),
        eventPublisher: c.resolve('eventPublisher'),
        validator: new AdjustStockInputValidator(),
      }),
    { lifetime: 'singleton' },
  );

  container.register(
    'adjustStockUseCasePipeline',
    (c) =>
      new UseCasePipelineBuilder(c.resolve('adjustStockUseCase'))
        .withTransaction(c.resolve('unitOfWork'))
        // No real actor/permission system exists yet (domain/auth is still
        // scaffolded) — this permissive policy is a placeholder so the
        // pipeline shape is real and testable now; swap in a real policy
        // once authorization exists, with no change to the controller.
        .withAuthorization(() => true, 'AdjustStockUseCase')
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
      }),
    { lifetime: 'singleton' },
  );

  container.register(
    'inventoryController',
    (c) => createInventoryController(c.resolve('adjustStockUseCasePipeline')),
    { lifetime: 'singleton' },
  );

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
 *   inventoryRepository: *,
 *   unitOfWork: *,
 *   eventPublisher: *,
 *   logger: *,
 *   adjustStockUseCase: AdjustStockUseCase,
 *   adjustStockUseCasePipeline: *,
 *   orderFulfillmentOrchestrator: OrderFulfillmentOrchestrator,
 *   inventoryController: *,
 * }}
 */
function buildApp(options) {
  const container = buildContainer(options);
  return {
    container,
    inventoryRepository: container.resolve('inventoryRepository'),
    unitOfWork: container.resolve('unitOfWork'),
    eventPublisher: container.resolve('eventPublisher'),
    logger: container.resolve('logger'),
    adjustStockUseCase: container.resolve('adjustStockUseCase'),
    adjustStockUseCasePipeline: container.resolve('adjustStockUseCasePipeline'),
    orderFulfillmentOrchestrator: container.resolve('orderFulfillmentOrchestrator'),
    inventoryController: container.resolve('inventoryController'),
  };
}

module.exports = { buildContainer, buildApp };
