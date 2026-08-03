'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createInventoryController } = require('./InventoryController');
const { Result } = require('../../../../domain/shared-kernel/result/Result');
const { NotFoundError, BusinessRuleViolationError } = require('../../../../domain/shared-kernel/errors/DomainError');

describe('InventoryController#reserveStock', () => {
  test('returns 200 with a projected sku/quantityOnHand body on Result.ok', async () => {
    const adjustStockUseCasePipeline = {
      execute: async () => Result.ok({ sku: 'ABC-123', quantityOnHand: 6, internal: 'not-for-the-wire' }),
    };
    const controller = createInventoryController({ adjustStockUseCasePipeline });

    const response = await controller.reserveStock({
      params: { sku: 'ABC-123' },
      body: { amount: 4 },
      url: '/inventory/ABC-123/reserve',
    });

    assert.deepEqual(response, { status: 200, body: { sku: 'ABC-123', quantityOnHand: 6 } });
  });

  test('normalizes a Result.err(NotFoundError) into a 404 Problem Details response', async () => {
    const adjustStockUseCasePipeline = {
      execute: async () => Result.err(new NotFoundError('No product found for sku "missing".')),
    };
    const controller = createInventoryController({ adjustStockUseCasePipeline });

    const response = await controller.reserveStock({
      params: { sku: 'missing' },
      body: { amount: 1 },
      url: '/inventory/missing/reserve',
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'NOT_FOUND');
    assert.equal(response.body.instance, '/inventory/missing/reserve');
  });

  test('normalizes a Result.err(BusinessRuleViolationError) into a 422', async () => {
    const adjustStockUseCasePipeline = {
      execute: async () => Result.err(new BusinessRuleViolationError('Insufficient stock.')),
    };
    const controller = createInventoryController({ adjustStockUseCasePipeline });

    const response = await controller.reserveStock({
      params: { sku: 'ABC-123' },
      body: { amount: 999 },
      url: '/inventory/ABC-123/reserve',
    });

    assert.equal(response.status, 422);
  });

  test('passes sku and amount straight through to the pipeline, unchanged', async () => {
    let received;
    const adjustStockUseCasePipeline = {
      execute: async (input) => {
        received = input;
        return Result.ok({ sku: input.sku, quantityOnHand: 1 });
      },
    };
    const controller = createInventoryController({ adjustStockUseCasePipeline });

    await controller.reserveStock({ params: { sku: 'ABC-123' }, body: { amount: 2 }, url: '/x' });

    assert.deepEqual(received, { sku: 'ABC-123', amount: 2 });
  });
});
