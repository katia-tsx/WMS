'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Product, InsufficientStockError } = require('./Product');
const { AggregateRoot } = require('../../shared-kernel/entities/AggregateRoot');
const { StockLevelChangedEvent } = require('../events/StockLevelChangedEvent');
const { StockDepletedEvent } = require('../events/StockDepletedEvent');
const { LowStockThresholdBreachedEvent } = require('../events/LowStockThresholdBreachedEvent');

describe('Product construction', () => {
  test('requires a sku, a name, and a non-negative quantityOnHand', () => {
    assert.throws(() => new Product({ name: 'Widget', quantityOnHand: 1 }), /requires a sku/);
    assert.throws(() => new Product({ sku: 'ABC-123', quantityOnHand: 1 }), /requires a name/);
    assert.throws(() => new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: -1 }), /cannot be negative/);
  });

  test('is an AggregateRoot identified by its sku, with no buffered events yet', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 });
    assert.ok(product instanceof AggregateRoot);
    assert.equal(product.id, 'ABC-123');
    assert.deepEqual(product.pullDomainEvents(), []);
  });
});

describe('Product#receiveStock', () => {
  test('increases quantityOnHand and records a StockLevelChangedEvent', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 });
    product.receiveStock(5);

    assert.equal(product.quantityOnHand, 15);
    const events = product.pullDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof StockLevelChangedEvent);
    assert.equal(events[0].previousQuantityOnHand, 10);
    assert.equal(events[0].newQuantityOnHand, 15);
  });

  test('rejects a non-positive amount', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 });
    assert.throws(() => product.receiveStock(0), /must be positive/);
    assert.throws(() => product.receiveStock(-1), /must be positive/);
  });
});

describe('Product#reserveStock', () => {
  test('decreases quantityOnHand and records a StockLevelChangedEvent', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 });
    product.reserveStock(4);

    assert.equal(product.quantityOnHand, 6);
    const events = product.pullDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof StockLevelChangedEvent);
    assert.equal(events[0].previousQuantityOnHand, 10);
    assert.equal(events[0].newQuantityOnHand, 6);
  });

  test('rejects a non-positive amount', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 });
    assert.throws(() => product.reserveStock(0), /must be positive/);
  });

  test('throws InsufficientStockError, and records no events, when reserving more than is on hand', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 2 });
    assert.throws(() => product.reserveStock(5), InsufficientStockError);
    assert.deepEqual(product.pullDomainEvents(), []);
  });

  test('records a StockDepletedEvent (not a LowStockThresholdBreachedEvent) when the reservation brings stock to exactly zero', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 5, reorderThreshold: 2 });
    product.reserveStock(5);

    const events = product.pullDomainEvents();
    assert.equal(events.length, 2);
    assert.ok(events[0] instanceof StockLevelChangedEvent);
    assert.ok(events[1] instanceof StockDepletedEvent);
  });

  test('records a LowStockThresholdBreachedEvent exactly on the transition across the reorder threshold', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10, reorderThreshold: 5 });

    product.reserveStock(6); // 10 -> 4: crosses from above (10>5) to at/below (4<=5)
    let events = product.pullDomainEvents();
    assert.equal(events.length, 2);
    assert.ok(events[1] instanceof LowStockThresholdBreachedEvent);
    assert.equal(events[1].quantityOnHand, 4);
    assert.equal(events[1].reorderThreshold, 5);

    product.reserveStock(1); // 4 -> 3: already below threshold, must not fire again
    events = product.pullDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof StockLevelChangedEvent);
  });

  test('does not record a LowStockThresholdBreachedEvent when staying above the threshold', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10, reorderThreshold: 2 });
    product.reserveStock(3); // 10 -> 7, still above 2

    const events = product.pullDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof StockLevelChangedEvent);
  });
});

describe('Product#isBelowReorderThreshold', () => {
  test('is true once quantityOnHand is at or below the threshold', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 5, reorderThreshold: 5 });
    assert.equal(product.isBelowReorderThreshold(), true);
  });

  test('is false while above the threshold', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 6, reorderThreshold: 5 });
    assert.equal(product.isBelowReorderThreshold(), false);
  });
});

describe('Product#pullDomainEvents', () => {
  test('clears the buffer so events are not delivered twice', () => {
    const product = new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 });
    product.receiveStock(1);
    product.pullDomainEvents();
    assert.deepEqual(product.pullDomainEvents(), []);
  });
});
