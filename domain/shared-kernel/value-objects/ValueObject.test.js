'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ValueObject } = require('./ValueObject');

class Money extends ValueObject {
  constructor(amount, currency) {
    super({ amount, currency });
  }

  get amount() {
    return this.props.amount;
  }

  get currency() {
    return this.props.currency;
  }
}

class Coordinate extends ValueObject {
  constructor(lat, lng) {
    super({ lat, lng });
  }
}

describe('ValueObject', () => {
  test('exposes constructor fields via getters over props', () => {
    const price = new Money(10, 'USD');
    assert.equal(price.amount, 10);
    assert.equal(price.currency, 'USD');
  });

  test('two value objects with the same props are equal', () => {
    const a = new Money(10, 'USD');
    const b = new Money(10, 'USD');
    assert.equal(a.equals(b), true);
  });

  test('value objects with different props are not equal', () => {
    const a = new Money(10, 'USD');
    const b = new Money(20, 'USD');
    assert.equal(a.equals(b), false);
  });

  test('value objects of different subclasses are never equal, even with matching field values', () => {
    const money = new Money(10, 20);
    const coordinate = new Coordinate(10, 20);
    assert.equal(money.equals(coordinate), false);
  });

  test('is not equal to null or undefined', () => {
    const a = new Money(10, 'USD');
    assert.equal(a.equals(null), false);
    assert.equal(a.equals(undefined), false);
  });

  test('the instance is frozen: reassigning an existing field throws', () => {
    const price = new Money(10, 'USD');
    assert.throws(() => {
      price.props = { amount: 99, currency: 'EUR' };
    }, TypeError);
  });

  test('the instance is frozen: adding a new field throws', () => {
    const price = new Money(10, 'USD');
    assert.throws(() => {
      price.extra = 'not allowed';
    }, TypeError);
  });

  test('the props bag itself is frozen: mutating a field in place throws', () => {
    const price = new Money(10, 'USD');
    assert.throws(() => {
      price.props.amount = 99;
    }, TypeError);
    assert.equal(price.amount, 10);
  });

  test('Object.freeze is actually in effect on both the instance and its props', () => {
    const price = new Money(10, 'USD');
    assert.equal(Object.isFrozen(price), true);
    assert.equal(Object.isFrozen(price.props), true);
  });
});
