'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { buildContainer, buildApp } = require('./CompositionRoot');
const { InMemoryInventoryRepository } = require('../database/InMemoryInventoryRepository');
const { PostgresInventoryRepository } = require('../database/PostgresInventoryRepository');
const { InMemoryUnitOfWork } = require('../database/InMemoryUnitOfWork');
const { PostgresUnitOfWork } = require('../database/PostgresUnitOfWork');
const { InMemoryEventPublisher } = require('../events/InMemoryEventPublisher');
const { ConsoleEventPublisher } = require('../events/ConsoleEventPublisher');
const { InMemoryLogger } = require('../logging/InMemoryLogger');
const { ConsoleLogger } = require('../logging/ConsoleLogger');
const { AdjustStockUseCase } = require('../../application/use-cases/inventory/AdjustStockUseCase');
const { OrderFulfillmentOrchestrator } = require('../../application/orchestrators/OrderFulfillmentOrchestrator');
const { Product } = require('../../domain/inventory/entities/Product');

/** @param {ReturnType<typeof buildApp>} app */
function assertFullGraphResolved(app) {
  assert.ok(app.adjustStockUseCase instanceof AdjustStockUseCase);
  assert.ok(app.orderFulfillmentOrchestrator instanceof OrderFulfillmentOrchestrator);
  assert.equal(typeof app.adjustStockUseCasePipeline.execute, 'function');
  assert.equal(typeof app.inventoryController.reserveStock, 'function');
}

describe('CompositionRoot — test configuration', () => {
  test('resolves the full dependency graph with in-memory adapters and no runtime errors', () => {
    const app = buildApp({ mode: 'test' });

    assert.ok(app.inventoryRepository instanceof InMemoryInventoryRepository);
    assert.ok(app.unitOfWork instanceof InMemoryUnitOfWork);
    assert.ok(app.eventPublisher instanceof InMemoryEventPublisher);
    assert.ok(app.logger instanceof InMemoryLogger);
    assertFullGraphResolved(app);
  });

  test('the wired graph is actually usable end to end: reserving stock persists and publishes on depletion', async () => {
    const app = buildApp({ mode: 'test' });
    await app.inventoryRepository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 5 }));

    const result = await app.adjustStockUseCase.execute({ sku: 'ABC-123', amount: 5 });

    assert.equal(result.isOk, true);
    assert.equal(result.value.quantityOnHand, 0);
    assert.equal(app.eventPublisher.publishedEvents.length, 1);
    assert.equal(app.eventPublisher.publishedEvents[0].type, 'inventory.stock-depleted');
  });

  test('the controller is wired to the full pipeline: it logs, opens/commits a transaction, and normalizes the response', async () => {
    const app = buildApp({ mode: 'test' });
    await app.inventoryRepository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 }));

    const response = await app.inventoryController.reserveStock({ params: { sku: 'ABC-123' }, body: { amount: 4 } });

    assert.deepEqual(response, { status: 200, body: { sku: 'ABC-123', quantityOnHand: 6 } });
    assert.ok(app.logger.entries.some((e) => e.message === 'AdjustStockUseCase started'));
    assert.ok(app.logger.entries.some((e) => e.message === 'AdjustStockUseCase succeeded'));
  });

  test('the pipeline normalizes an unknown sku into a 404 through the controller', async () => {
    const app = buildApp({ mode: 'test' });

    const response = await app.inventoryController.reserveStock({ params: { sku: 'missing' }, body: { amount: 1 } });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'NOT_FOUND');
  });

  test('atomicity across aggregate boundaries: through the real composition-root wiring, a failure on a later order line rolls back an earlier line\'s already-applied reservation', async () => {
    const app = buildApp({ mode: 'test' });
    await app.inventoryRepository.save(new Product({ sku: 'A', name: 'Widget A', quantityOnHand: 10 }));
    // No product 'B' is stored, so the second line fails with NotFoundError.

    const result = await app.orderFulfillmentOrchestrator.fulfill({
      lines: [
        { sku: 'A', quantity: 4 }, // would succeed in isolation
        { sku: 'B', quantity: 1 }, // fails: unknown sku
      ],
    });

    assert.equal(result.isErr, true);
    // The whole workflow rolled back through the real InMemoryUnitOfWork
    // wired by CompositionRoot, so A's reservation was undone too.
    assert.equal((await app.inventoryRepository.findBySku('A')).quantityOnHand, 10);
  });
});

describe('CompositionRoot — production configuration', () => {
  let originalDatabaseUrl;

  before(() => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://test-user:test-pass@localhost:5432/wms_test';
  });

  after(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  test('resolves the full dependency graph with production adapters and no runtime errors', () => {
    const app = buildApp({ mode: 'production' });

    assert.ok(app.inventoryRepository instanceof PostgresInventoryRepository);
    assert.ok(app.unitOfWork instanceof PostgresUnitOfWork);
    assert.ok(app.eventPublisher instanceof ConsoleEventPublisher);
    assert.ok(app.logger instanceof ConsoleLogger);
    assertFullGraphResolved(app);
  });

  test('the production inventory repository and unit of work are constructed with the configured connection string', () => {
    const app = buildApp({ mode: 'production' });
    assert.equal(app.inventoryRepository.connectionString, 'postgres://test-user:test-pass@localhost:5432/wms_test');
    assert.equal(app.unitOfWork.connectionString, 'postgres://test-user:test-pass@localhost:5432/wms_test');
  });

  test('production query methods and transactions are honestly stubbed rather than silently wrong', async () => {
    const app = buildApp({ mode: 'production' });
    await assert.rejects(() => app.inventoryRepository.findBySku('ABC-123'), /not yet implemented/);
    await assert.rejects(() => app.unitOfWork.begin(), /not yet implemented/);
  });
});

describe('CompositionRoot — default (development) configuration', () => {
  let originalNodeEnv;
  let originalRuntimeMode;

  before(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalRuntimeMode = process.env.RUNTIME_MODE;
    delete process.env.NODE_ENV;
    delete process.env.RUNTIME_MODE;
  });

  after(() => {
    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    if (originalRuntimeMode !== undefined) process.env.RUNTIME_MODE = originalRuntimeMode;
  });

  test('with no RUNTIME_MODE/NODE_ENV set, defaults to in-memory adapters so the scaffold runs with zero external services', () => {
    const app = buildApp();

    assert.ok(app.inventoryRepository instanceof InMemoryInventoryRepository);
    assert.ok(app.unitOfWork instanceof InMemoryUnitOfWork);
    assert.ok(app.eventPublisher instanceof ConsoleEventPublisher);
    assert.ok(app.logger instanceof ConsoleLogger);
    assertFullGraphResolved(app);
  });
});

describe('CompositionRoot — singleton wiring', () => {
  test('resolving the same binding twice from one container returns the same instance', () => {
    const container = buildContainer({ mode: 'test' });
    assert.equal(container.resolve('inventoryRepository'), container.resolve('inventoryRepository'));
    assert.equal(container.resolve('adjustStockUseCase'), container.resolve('adjustStockUseCase'));
  });

  test('two separate buildContainer calls produce independent graphs', () => {
    const containerA = buildContainer({ mode: 'test' });
    const containerB = buildContainer({ mode: 'test' });
    assert.notEqual(containerA.resolve('inventoryRepository'), containerB.resolve('inventoryRepository'));
  });
});
