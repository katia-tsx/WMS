'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
} = require('./DomainError');

describe('DomainError hierarchy', () => {
  test('DomainError carries a machine-readable code and human-readable message', () => {
    const error = new DomainError('SOME_CODE', 'Something went wrong.');
    assert.equal(error.code, 'SOME_CODE');
    assert.equal(error.message, 'Something went wrong.');
    assert.ok(error instanceof Error);
  });

  test('every subclass is an instanceof DomainError and Error', () => {
    for (const ErrorClass of [ValidationError, NotFoundError, ConflictError, BusinessRuleViolationError]) {
      const error = new ErrorClass('boom');
      assert.ok(error instanceof DomainError);
      assert.ok(error instanceof Error);
      assert.equal(error.name, ErrorClass.name);
    }
  });

  test('each subclass defaults to its own machine-readable code', () => {
    assert.equal(new ValidationError('m').code, 'VALIDATION_ERROR');
    assert.equal(new NotFoundError('m').code, 'NOT_FOUND');
    assert.equal(new ConflictError('m').code, 'CONFLICT');
    assert.equal(new BusinessRuleViolationError('m').code, 'BUSINESS_RULE_VIOLATION');
  });

  test('the default code can be overridden', () => {
    const error = new NotFoundError('Product not found.', 'PRODUCT_NOT_FOUND');
    assert.equal(error.code, 'PRODUCT_NOT_FOUND');
  });
});
