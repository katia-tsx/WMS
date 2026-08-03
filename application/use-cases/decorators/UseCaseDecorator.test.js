'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { UseCaseDecorator } = require('./UseCaseDecorator');
const { Result } = require('../../../domain/shared-kernel/result/Result');

describe('UseCaseDecorator', () => {
  test('requires an inner use case', () => {
    assert.throws(() => new UseCaseDecorator(undefined));
  });

  test('delegates execute to the inner use case by default', async () => {
    const inner = { execute: async (input) => Result.ok(input) };
    const decorator = new UseCaseDecorator(inner);

    const result = await decorator.execute({ sku: 'ABC-123' });

    assert.equal(result.isOk, true);
    assert.deepEqual(result.value, { sku: 'ABC-123' });
  });
});
