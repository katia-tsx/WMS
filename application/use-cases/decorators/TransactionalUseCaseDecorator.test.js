'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { TransactionalUseCaseDecorator } = require('./TransactionalUseCaseDecorator');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { BusinessRuleViolationError } = require('../../../domain/shared-kernel/errors/DomainError');

class RecordingUnitOfWork {
  constructor() {
    this.calls = [];
  }

  async begin() {
    this.calls.push('begin');
  }

  async commit() {
    this.calls.push('commit');
  }

  async rollback() {
    this.calls.push('rollback');
  }
}

describe('TransactionalUseCaseDecorator', () => {
  test('begins then commits around a Result.ok', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const inner = { execute: async (input) => Result.ok(input) };
    const decorator = new TransactionalUseCaseDecorator(inner, { unitOfWork });

    const result = await decorator.execute({ sku: 'ABC-123' });

    assert.equal(result.isOk, true);
    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
  });

  test('begins then rolls back around a Result.err, still returning the error', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const inner = { execute: async () => Result.err(new BusinessRuleViolationError('Insufficient stock.')) };
    const decorator = new TransactionalUseCaseDecorator(inner, { unitOfWork });

    const result = await decorator.execute({ sku: 'ABC-123' });

    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof BusinessRuleViolationError);
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
  });

  test('rolls back and rethrows on a thrown (programmer) error', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const inner = { execute: async () => { throw new TypeError('boom'); } };
    const decorator = new TransactionalUseCaseDecorator(inner, { unitOfWork });

    await assert.rejects(() => decorator.execute({}), TypeError);
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
  });
});
