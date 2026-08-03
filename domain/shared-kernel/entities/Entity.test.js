'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Entity } = require('./Entity');

class TestUser extends Entity {
  constructor(id, name) {
    super(id);
    this.name = name;
  }
}

describe('Entity', () => {
  test('requires a non-null/undefined id', () => {
    assert.throws(() => new TestUser(undefined, 'Ada'), /id is required/);
    assert.throws(() => new TestUser(null, 'Ada'), /id is required/);
  });

  test('exposes the id via a getter', () => {
    const user = new TestUser('u-1', 'Ada');
    assert.equal(user.id, 'u-1');
  });

  test('two entities of the same subclass with the same id are equal', () => {
    const a = new TestUser('u-1', 'Ada');
    const b = new TestUser('u-1', 'Grace');
    assert.equal(a.equals(b), true);
  });

  test('two entities with different ids are not equal', () => {
    const a = new TestUser('u-1', 'Ada');
    const b = new TestUser('u-2', 'Ada');
    assert.equal(a.equals(b), false);
  });

  test('an entity is equal to itself', () => {
    const a = new TestUser('u-1', 'Ada');
    assert.equal(a.equals(a), true);
  });

  test('is not equal to null, undefined, or a non-Entity', () => {
    const a = new TestUser('u-1', 'Ada');
    assert.equal(a.equals(null), false);
    assert.equal(a.equals(undefined), false);
    assert.equal(a.equals({ id: 'u-1' }), false);
  });
});
