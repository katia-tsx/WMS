'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IRepository } = require('./IRepository');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('IRepository (base contract)', () => {
  test('every method rejects with NotImplementedError when not overridden', async () => {
    const repository = new IRepository();
    await assert.rejects(() => repository.findById('id-1'), NotImplementedError);
    await assert.rejects(() => repository.findAll(), NotImplementedError);
    await assert.rejects(() => repository.save({}), NotImplementedError);
    await assert.rejects(() => repository.delete('id-1'), NotImplementedError);
    await assert.rejects(() => repository.findBySpecification({}), NotImplementedError);
  });
});

describe('IRepository (concrete adapter via extension)', () => {
  class InMemoryFakeRepository extends IRepository {
    constructor() {
      super();
      this.store = new Map();
    }

    async findById(id) {
      return this.store.get(id) ?? null;
    }

    async findAll() {
      return Array.from(this.store.values());
    }

    async save(entity) {
      this.store.set(entity.id, entity);
    }

    async delete(id) {
      this.store.delete(id);
    }

    async findBySpecification(specification) {
      return Array.from(this.store.values()).filter((entity) => specification.isSatisfiedBy(entity));
    }
  }

  test('an adapter that overrides every method behaves normally, with no NotImplementedError', async () => {
    const repository = new InMemoryFakeRepository();
    await repository.save({ id: 'p-1', name: 'Widget' });

    assert.deepEqual(await repository.findById('p-1'), { id: 'p-1', name: 'Widget' });
    assert.deepEqual(await repository.findAll(), [{ id: 'p-1', name: 'Widget' }]);

    await repository.delete('p-1');
    assert.equal(await repository.findById('p-1'), null);
  });
});
