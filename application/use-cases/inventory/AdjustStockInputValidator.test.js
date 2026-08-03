'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { AdjustStockInputValidator } = require('./AdjustStockInputValidator');
const { ValidationError } = require('../../../domain/shared-kernel/errors/DomainError');

describe('AdjustStockInputValidator', () => {
  const validator = new AdjustStockInputValidator();

  test('accepts a well-formed sku and a positive amount', () => {
    const result = validator.validate({ sku: 'ABC-123', amount: 5 });
    assert.equal(result.isOk, true);
  });

  test('rejects a missing or empty sku', () => {
    assert.equal(validator.validate({ sku: '', amount: 5 }).isErr, true);
    assert.equal(validator.validate({ amount: 5 }).isErr, true);
    assert.ok(validator.validate({ amount: 5 }).error instanceof ValidationError);
  });

  test('rejects a non-positive or non-numeric amount', () => {
    assert.equal(validator.validate({ sku: 'ABC-123', amount: 0 }).isErr, true);
    assert.equal(validator.validate({ sku: 'ABC-123', amount: -1 }).isErr, true);
    assert.equal(validator.validate({ sku: 'ABC-123', amount: 'five' }).isErr, true);
  });
});
