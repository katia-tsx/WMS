'use strict';

const { Container } = require('./Container');
const { loadEnvFile, getRuntimeMode } = require('../config/env');

const { AdjustStockUseCase } = require('../../application/use-cases/inventory/AdjustStockUseCase');
const { OrderFulfillmentOrchestrator } = require('../../application/orchestrators/OrderFulfillmentOrchestrator');

const { InMemoryInventoryRepository } = require('../database/InMemoryInventoryRepository');
const { PostgresInventoryRepository } = require('../database/PostgresInventoryRepository');
const { ConsoleEventPublisher } = require('../events/ConsoleEventPublisher');
const { InMemoryEventPublisher } = require('../events/InMemoryEventPublisher');
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
    'adjustStockUseCase',
    (c) =>
      new AdjustStockUseCase({
        inventoryRepository: c.resolve('inventoryRepository'),
        eventPublisher: c.resolve('eventPublisher'),
      }),
    { lifetime: 'singleton' },
  );

  container.register(
    'orderFulfillmentOrchestrator',
    (c) => new OrderFulfillmentOrchestrator({ adjustStockUseCase: c.resolve('adjustStockUseCase') }),
    { lifetime: 'singleton' },
  );

  container.register(
    'inventoryController',
    (c) => createInventoryController(c.resolve('adjustStockUseCase')),
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
 *   eventPublisher: *,
 *   adjustStockUseCase: AdjustStockUseCase,
 *   orderFulfillmentOrchestrator: OrderFulfillmentOrchestrator,
 *   inventoryController: *,
 * }}
 */
function buildApp(options) {
  const container = buildContainer(options);
  return {
    container,
    inventoryRepository: container.resolve('inventoryRepository'),
    eventPublisher: container.resolve('eventPublisher'),
    adjustStockUseCase: container.resolve('adjustStockUseCase'),
    orderFulfillmentOrchestrator: container.resolve('orderFulfillmentOrchestrator'),
    inventoryController: container.resolve('inventoryController'),
  };
}

module.exports = { buildContainer, buildApp };
