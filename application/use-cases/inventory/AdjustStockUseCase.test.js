'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { AdjustStockUseCase } = require('./AdjustStockUseCase');
const { AdjustStockInputValidator } = require('./AdjustStockInputValidator');
const { Product } = require('../../../domain/inventory/entities/Product');
const { NotFoundError, BusinessRuleViolationError, ValidationError } = require('../../../domain/shared-kernel/errors/DomainError');

class FakeInventoryRepository {
  constructor(products = []) {
    this.products = new Map(products.map((p) => [p.sku, p]));
  }

  async findBySku(sku) {
    return this.products.get(sku) ?? null;
  }

  async save(product) {
    this.products.set(product.sku, product);
  }
}

describe('AdjustStockUseCase', () => {
  test('returns Result.err(NotFoundError) for an unknown sku', async () => {
    const useCase = new AdjustStockUseCase({ inventoryRepository: new FakeInventoryRepository() });

    const result = await useCase.execute({ sku: 'missing', amount: 1 });

    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof NotFoundError);
  });

  test('returns Result.err(BusinessRuleViolationError) when reserving more than is on hand', async () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 2 });
    const useCase = new AdjustStockUseCase({ inventoryRepository: new FakeInventoryRepository([product]) });

    const result = await useCase.execute({ sku: 'ABC-123', amount: 5 });

    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof BusinessRuleViolationError);
  });

  test('returns Result.ok(product) and saves the reservation on success', async () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 });
    const repository = new FakeInventoryRepository([product]);
    const useCase = new AdjustStockUseCase({ inventoryRepository: repository });

    const result = await useCase.execute({ sku: 'ABC-123', amount: 4 });

    assert.equal(result.isOk, true);
    assert.equal(result.value.quantityOnHand, 6);
    assert.equal((await repository.findBySku('ABC-123')).quantityOnHand, 6);
  });

  test('the returned product carries its own buffered domain events; this use case never publishes them itself', async () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 5 });
    const useCase = new AdjustStockUseCase({ inventoryRepository: new FakeInventoryRepository([product]) });

    const result = await useCase.execute({ sku: 'ABC-123', amount: 5 });

    assert.equal(result.isOk, true);
    const events = result.value.pullDomainEvents();
    assert.equal(events.length, 2); // StockLevelChangedEvent + StockDepletedEvent
    assert.equal(events[1].eventType, 'inventory.stock-depleted');
    // AdjustStockUseCase has no eventPublisher dependency at all:
    assert.equal(useCase.eventPublisher, undefined);
  });

  test('with a validator injected, invalid input short-circuits before the repository is even queried', async () => {
    let repositoryQueried = false;
    const repository = {
      async findBySku() {
        repositoryQueried = true;
        return null;
      },
      async save() {},
    };

    const useCase = new AdjustStockUseCase({
      inventoryRepository: repository,
      validator: new AdjustStockInputValidator(),
    });

    const result = await useCase.execute({ sku: '', amount: -1 });

    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof ValidationError);
    assert.equal(repositoryQueried, false);
  });
});
