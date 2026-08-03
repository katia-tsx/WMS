'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryInventoryRepository } = require('./InMemoryInventoryRepository');
const { Product } = require('../../domain/inventory/entities/Product');

describe('InMemoryInventoryRepository', () => {
  test('save then findBySku round-trips the product', async () => {
    const repository = new InMemoryInventoryRepository();
    await repository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 }));

    const found = await repository.findBySku('ABC-123');

    assert.equal(found.sku, 'ABC-123');
    assert.equal(found.quantityOnHand, 10);
  });

  test('findBySku returns null for an unknown sku', async () => {
    const repository = new InMemoryInventoryRepository();
    assert.equal(await repository.findBySku('missing'), null);
  });

  test('findBySku returns a copy: mutating it does not affect what a later read returns', async () => {
    const repository = new InMemoryInventoryRepository();
    await repository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 }));

    const first = await repository.findBySku('ABC-123');
    first.reserveStock(10); // mutate the caller's copy, but never call save()

    const second = await repository.findBySku('ABC-123');
    assert.equal(second.quantityOnHand, 10, 'storage must be untouched until save() is called');
  });

  test('findAll also returns copies, not live references', async () => {
    const repository = new InMemoryInventoryRepository();
    await repository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 }));

    const [product] = await repository.findAll();
    product.reserveStock(10);

    const [productAgain] = await repository.findAll();
    assert.equal(productAgain.quantityOnHand, 10);
  });
});
