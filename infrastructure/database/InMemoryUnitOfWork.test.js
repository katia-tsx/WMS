'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryUnitOfWork } = require('./InMemoryUnitOfWork');
const { InMemoryInventoryRepository } = require('./InMemoryInventoryRepository');
const { Product } = require('../../domain/inventory/entities/Product');

describe('InMemoryUnitOfWork', () => {
  test('commit() keeps whatever writes happened since begin()', async () => {
    const repository = new InMemoryInventoryRepository();
    await repository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 }));
    const unitOfWork = new InMemoryUnitOfWork([repository.products]);

    await unitOfWork.begin();
    const product = await repository.findBySku('ABC-123');
    product.reserveStock(4);
    await repository.save(product);
    await unitOfWork.commit();

    assert.equal((await repository.findBySku('ABC-123')).quantityOnHand, 6);
  });

  test('rollback() undoes every write made since begin(), across multiple keys', async () => {
    const repository = new InMemoryInventoryRepository();
    await repository.save(new Product({ sku: 'A', name: 'Widget A', quantityOnHand: 10 }));
    await repository.save(new Product({ sku: 'B', name: 'Widget B', quantityOnHand: 20 }));
    const unitOfWork = new InMemoryUnitOfWork([repository.products]);

    await unitOfWork.begin();
    const a = await repository.findBySku('A');
    a.reserveStock(10);
    await repository.save(a);

    const b = await repository.findBySku('B');
    b.reserveStock(20);
    await repository.save(b);

    await unitOfWork.rollback();

    assert.equal((await repository.findBySku('A')).quantityOnHand, 10);
    assert.equal((await repository.findBySku('B')).quantityOnHand, 20);
  });

  test('rollback() before any begin() is a safe no-op', async () => {
    const repository = new InMemoryInventoryRepository();
    await repository.save(new Product({ sku: 'A', name: 'Widget A', quantityOnHand: 10 }));
    const unitOfWork = new InMemoryUnitOfWork([repository.products]);

    await unitOfWork.rollback();

    assert.equal((await repository.findBySku('A')).quantityOnHand, 10);
  });

  test('supports snapshotting multiple stores at once', async () => {
    const storeOne = new Map([['x', 1]]);
    const storeTwo = new Map([['y', 2]]);
    const unitOfWork = new InMemoryUnitOfWork([storeOne, storeTwo]);

    await unitOfWork.begin();
    storeOne.set('x', 999);
    storeTwo.delete('y');
    await unitOfWork.rollback();

    assert.equal(storeOne.get('x'), 1);
    assert.equal(storeTwo.get('y'), 2);
  });
});
