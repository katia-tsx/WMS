'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ISpecification, AndSpecification, OrSpecification, NotSpecification } = require('./ISpecification');
const { NotImplementedError } = require('./errors/NotImplementedError');

class IsEven extends ISpecification {
  isSatisfiedBy(candidate) {
    return candidate % 2 === 0;
  }
}

class IsPositive extends ISpecification {
  isSatisfiedBy(candidate) {
    return candidate > 0;
  }
}

describe('ISpecification (base contract)', () => {
  test('isSatisfiedBy throws NotImplementedError when not overridden', () => {
    const spec = new ISpecification();
    assert.throws(() => spec.isSatisfiedBy(4), NotImplementedError);
  });
});

describe('ISpecification#and', () => {
  test('returns an AndSpecification satisfied only when both sides are', () => {
    const evenAndPositive = new IsEven().and(new IsPositive());
    assert.ok(evenAndPositive instanceof AndSpecification);
    assert.equal(evenAndPositive.isSatisfiedBy(4), true);
    assert.equal(evenAndPositive.isSatisfiedBy(-4), false);
    assert.equal(evenAndPositive.isSatisfiedBy(3), false);
  });
});

describe('ISpecification#or', () => {
  test('returns an OrSpecification satisfied when either side is', () => {
    const evenOrPositive = new IsEven().or(new IsPositive());
    assert.ok(evenOrPositive instanceof OrSpecification);
    assert.equal(evenOrPositive.isSatisfiedBy(-4), true); // even, not positive
    assert.equal(evenOrPositive.isSatisfiedBy(3), true); // positive, not even
    assert.equal(evenOrPositive.isSatisfiedBy(-3), false); // neither
  });
});

describe('ISpecification#not', () => {
  test('returns a NotSpecification that inverts the result', () => {
    const isOdd = new IsEven().not();
    assert.ok(isOdd instanceof NotSpecification);
    assert.equal(isOdd.isSatisfiedBy(3), true);
    assert.equal(isOdd.isSatisfiedBy(4), false);
  });
});

describe('composition', () => {
  test('and/or/not chain together into arbitrarily nested specifications', () => {
    // (even AND positive) OR (NOT positive) — i.e. positive evens, or non-positive numbers at all
    const spec = new IsEven().and(new IsPositive()).or(new IsPositive().not());
    assert.equal(spec.isSatisfiedBy(4), true); // positive even
    assert.equal(spec.isSatisfiedBy(-3), true); // not positive
    assert.equal(spec.isSatisfiedBy(3), false); // positive, odd, not covered by either branch
  });
});
