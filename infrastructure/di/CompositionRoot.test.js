'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { buildContainer, buildApp } = require('./CompositionRoot');
const { InMemoryInventoryRepository } = require('../database/InMemoryInventoryRepository');
const { PostgresInventoryRepository } = require('../database/PostgresInventoryRepository');
const { InMemoryEventPublisher } = require('../events/InMemoryEventPublisher');
const { ConsoleEventPublisher } = require('../events/ConsoleEventPublisher');
const { AdjustStockUseCase } = require('../../application/use-cases/inventory/AdjustStockUseCase');
const { OrderFulfillmentOrchestrator } = require('../../application/orchestrators/OrderFulfillmentOrchestrator');
const { Product } = require('../../domain/inventory/entities/Product');

/** @param {ReturnType<typeof buildApp>} app */
function assertFullGraphResolved(app) {
  assert.ok(app.adjustStockUseCase instanceof AdjustStockUseCase);
  assert.ok(app.orderFulfillmentOrchestrator instanceof OrderFulfillmentOrchestrator);
  assert.equal(typeof app.inventoryController.reserveStock, 'function');
}

describe('CompositionRoot — test configuration', () => {
  test('resolves the full dependency graph with in-memory adapters and no runtime errors', () => {
    const app = buildApp({ mode: 'test' });

    assert.ok(app.inventoryRepository instanceof InMemoryInventoryRepository);
    assert.ok(app.eventPublisher instanceof InMemoryEventPublisher);
    assertFullGraphResolved(app);
  });

  test('the wired graph is actually usable end to end: reserving stock persists and publishes on depletion', async () => {
    const app = buildApp({ mode: 'test' });
    await app.inventoryRepository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 5 }));

    const product = await app.adjustStockUseCase.execute({ sku: 'ABC-123', amount: 5 });

    assert.equal(product.quantityOnHand, 0);
    assert.equal(app.eventPublisher.publishedEvents.length, 1);
    assert.equal(app.eventPublisher.publishedEvents[0].type, 'inventory.stock-depleted');
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
    assert.ok(app.eventPublisher instanceof ConsoleEventPublisher);
    assertFullGraphResolved(app);
  });

  test('the production inventory repository is constructed with the configured connection string', () => {
    const app = buildApp({ mode: 'production' });
    assert.equal(app.inventoryRepository.connectionString, 'postgres://test-user:test-pass@localhost:5432/wms_test');
  });

  test('production query methods are honestly stubbed rather than silently wrong', async () => {
    const app = buildApp({ mode: 'production' });
    await assert.rejects(() => app.inventoryRepository.findBySku('ABC-123'), /not yet implemented/);
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
    assert.ok(app.eventPublisher instanceof ConsoleEventPublisher);
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
