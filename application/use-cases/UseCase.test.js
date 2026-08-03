'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { UseCase } = require('./UseCase');
const { NotImplementedError } = require('../ports/errors/NotImplementedError');
const { IValidator } = require('../ports/IValidator');
const { Result } = require('../../domain/shared-kernel/result/Result');
const { ValidationError } = require('../../domain/shared-kernel/errors/DomainError');

describe('UseCase (base contract)', () => {
  test('handle rejects with NotImplementedError when not overridden', async () => {
    const useCase = new UseCase();
    await assert.rejects(() => useCase.execute({}), NotImplementedError);
  });
});

class EchoUseCase extends UseCase {
  async handle(input) {
    return Result.ok(input);
  }
}

class PositiveAmountValidator extends IValidator {
  validate(input) {
    if (typeof input.amount !== 'number' || input.amount <= 0) {
      return Result.err(new ValidationError('amount must be a positive number.'));
    }
    return Result.ok(input);
  }
}

describe('UseCase#execute — without a validator', () => {
  test('delegates straight to handle', async () => {
    const useCase = new EchoUseCase();
    const result = await useCase.execute({ amount: 5 });
    assert.equal(result.isOk, true);
    assert.deepEqual(result.value, { amount: 5 });
  });
});

describe('UseCase#execute — with a validator', () => {
  test('runs handle when validation passes', async () => {
    const useCase = new EchoUseCase({ validator: new PositiveAmountValidator() });
    const result = await useCase.execute({ amount: 5 });
    assert.equal(result.isOk, true);
    assert.deepEqual(result.value, { amount: 5 });
  });

  test('short-circuits with the validator error and never calls handle', async () => {
    let handleCalled = false;
    class TrackingUseCase extends UseCase {
      async handle(input) {
        handleCalled = true;
        return Result.ok(input);
      }
    }

    const useCase = new TrackingUseCase({ validator: new PositiveAmountValidator() });
    const result = await useCase.execute({ amount: -5 });

    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof ValidationError);
    assert.equal(handleCalled, false);
  });
});
