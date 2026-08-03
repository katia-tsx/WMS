'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { AuthorizationError } = require('./AuthorizationError');
const { DomainError } = require('../../domain/shared-kernel/errors/DomainError');

describe('AuthorizationError', () => {
  test('is a DomainError with a default UNAUTHORIZED code', () => {
    const error = new AuthorizationError('Not authorized to execute AdjustStockUseCase.');
    assert.ok(error instanceof DomainError);
    assert.ok(error instanceof Error);
    assert.equal(error.code, 'UNAUTHORIZED');
    assert.equal(error.message, 'Not authorized to execute AdjustStockUseCase.');
  });

  test('the default code can be overridden', () => {
    const error = new AuthorizationError('Forbidden.', 'FORBIDDEN');
    assert.equal(error.code, 'FORBIDDEN');
  });
});
