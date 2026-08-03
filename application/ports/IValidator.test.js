'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IValidator } = require('./IValidator');
const { NotImplementedError } = require('./errors/NotImplementedError');
const { Result } = require('../../domain/shared-kernel/result/Result');
const { ValidationError } = require('../../domain/shared-kernel/errors/DomainError');

describe('IValidator (base contract)', () => {
  test('validate throws NotImplementedError when not overridden', () => {
    const validator = new IValidator();
    assert.throws(() => validator.validate({}), NotImplementedError);
  });
});

describe('IValidator (fake adapter)', () => {
  class PositiveNumberValidator extends IValidator {
    validate(input) {
      if (typeof input !== 'number' || input <= 0) {
        return Result.err(new ValidationError('input must be a positive number.'));
      }
      return Result.ok(input);
    }
  }

  test('returns Result.ok for valid input', () => {
    const result = new PositiveNumberValidator().validate(5);
    assert.equal(result.isOk, true);
    assert.equal(result.value, 5);
  });

  test('returns Result.err(ValidationError) for invalid input', () => {
    const result = new PositiveNumberValidator().validate(-5);
    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof ValidationError);
  });
});
