'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Guard } = require('./Guard');
const { ValidationError } = require('../errors/DomainError');

describe('Guard.againstNullOrUndefined', () => {
  test('throws a ValidationError on null or undefined', () => {
    assert.throws(() => Guard.againstNullOrUndefined(null, 'field'), ValidationError);
    assert.throws(() => Guard.againstNullOrUndefined(undefined, 'field'), ValidationError);
  });

  test('returns the value when present, including falsy-but-valid values', () => {
    assert.equal(Guard.againstNullOrUndefined('x', 'field'), 'x');
    assert.equal(Guard.againstNullOrUndefined(0, 'field'), 0);
    assert.equal(Guard.againstNullOrUndefined(false, 'field'), false);
  });
});

describe('Guard.againstEmptyString', () => {
  test('throws on empty or whitespace-only strings', () => {
    assert.throws(() => Guard.againstEmptyString('', 'name'), ValidationError);
    assert.throws(() => Guard.againstEmptyString('   ', 'name'), ValidationError);
  });

  test('throws on non-string values', () => {
    assert.throws(() => Guard.againstEmptyString(42, 'name'), ValidationError);
  });

  test('returns the value for a non-empty string', () => {
    assert.equal(Guard.againstEmptyString('Ada', 'name'), 'Ada');
  });
});

describe('Guard.inRange', () => {
  test('throws when the value is outside [min, max]', () => {
    assert.throws(() => Guard.inRange(-1, 0, 10, 'quantity'), ValidationError);
    assert.throws(() => Guard.inRange(11, 0, 10, 'quantity'), ValidationError);
  });

  test('accepts the boundary values', () => {
    assert.equal(Guard.inRange(0, 0, 10, 'quantity'), 0);
    assert.equal(Guard.inRange(10, 0, 10, 'quantity'), 10);
  });

  test('throws on non-number values', () => {
    assert.throws(() => Guard.inRange('5', 0, 10, 'quantity'), ValidationError);
    assert.throws(() => Guard.inRange(NaN, 0, 10, 'quantity'), ValidationError);
  });
});

describe('Guard.isPositiveNumber', () => {
  test('throws on zero, negative, or non-number values', () => {
    assert.throws(() => Guard.isPositiveNumber(0, 'amount'), ValidationError);
    assert.throws(() => Guard.isPositiveNumber(-5, 'amount'), ValidationError);
    assert.throws(() => Guard.isPositiveNumber('5', 'amount'), ValidationError);
    assert.throws(() => Guard.isPositiveNumber(NaN, 'amount'), ValidationError);
  });

  test('returns the value for a positive number', () => {
    assert.equal(Guard.isPositiveNumber(5, 'amount'), 5);
  });
});
