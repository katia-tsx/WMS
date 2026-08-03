'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { AuthorizationUseCaseDecorator } = require('./AuthorizationUseCaseDecorator');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { AuthorizationError } = require('../../errors/AuthorizationError');

describe('AuthorizationUseCaseDecorator', () => {
  test('runs the inner use case when the policy allows it', async () => {
    let innerCalled = false;
    const inner = {
      execute: async (input) => {
        innerCalled = true;
        return Result.ok(input);
      },
    };
    const decorator = new AuthorizationUseCaseDecorator(inner, { policy: () => true });

    const result = await decorator.execute({ sku: 'ABC-123' });

    assert.equal(innerCalled, true);
    assert.equal(result.isOk, true);
  });

  test('short-circuits with AuthorizationError when the policy denies it, never running the inner use case', async () => {
    let innerCalled = false;
    const inner = {
      execute: async (input) => {
        innerCalled = true;
        return Result.ok(input);
      },
    };
    const decorator = new AuthorizationUseCaseDecorator(inner, {
      policy: () => false,
      useCaseName: 'AdjustStockUseCase',
    });

    const result = await decorator.execute({ sku: 'ABC-123' });

    assert.equal(innerCalled, false);
    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof AuthorizationError);
    assert.match(result.error.message, /AdjustStockUseCase/);
  });

  test('supports an async policy', async () => {
    const inner = { execute: async (input) => Result.ok(input) };
    const decorator = new AuthorizationUseCaseDecorator(inner, {
      policy: async (input) => input.actorRole === 'admin',
    });

    const denied = await decorator.execute({ actorRole: 'guest' });
    const allowed = await decorator.execute({ actorRole: 'admin' });

    assert.equal(denied.isErr, true);
    assert.equal(allowed.isOk, true);
  });
});
