'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createInventoryController, statusForError } = require('./inventoryController');
const { Result } = require('../../domain/shared-kernel/result/Result');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
} = require('../../domain/shared-kernel/errors/DomainError');
const { AuthorizationError } = require('../../application/errors/AuthorizationError');

describe('statusForError', () => {
  test('maps each DomainError subclass to the expected HTTP status', () => {
    assert.equal(statusForError(new ValidationError('m')), 400);
    assert.equal(statusForError(new AuthorizationError('m')), 403);
    assert.equal(statusForError(new NotFoundError('m')), 404);
    assert.equal(statusForError(new ConflictError('m')), 409);
    assert.equal(statusForError(new BusinessRuleViolationError('m')), 422);
    assert.equal(statusForError(new Error('unexpected')), 500);
  });
});

describe('inventoryController#reserveStock', () => {
  test('returns 200 with the updated product on Result.ok', async () => {
    const adjustStockUseCase = { execute: async () => Result.ok({ sku: 'ABC-123', quantityOnHand: 6 }) };
    const controller = createInventoryController(adjustStockUseCase);

    const response = await controller.reserveStock({ params: { sku: 'ABC-123' }, body: { amount: 4 } });

    assert.deepEqual(response, { status: 200, body: { sku: 'ABC-123', quantityOnHand: 6 } });
  });

  test('normalizes a Result.err(NotFoundError) into a 404 with a machine-readable code', async () => {
    const adjustStockUseCase = { execute: async () => Result.err(new NotFoundError('No product found for sku "missing".')) };
    const controller = createInventoryController(adjustStockUseCase);

    const response = await controller.reserveStock({ params: { sku: 'missing' }, body: { amount: 1 } });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'NOT_FOUND');
  });

  test('normalizes a Result.err(BusinessRuleViolationError) into a 422', async () => {
    const adjustStockUseCase = { execute: async () => Result.err(new BusinessRuleViolationError('Insufficient stock.')) };
    const controller = createInventoryController(adjustStockUseCase);

    const response = await controller.reserveStock({ params: { sku: 'ABC-123' }, body: { amount: 999 } });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, 'BUSINESS_RULE_VIOLATION');
  });

  test('passes the request straight through to the use case, unchanged', async () => {
    let received;
    const adjustStockUseCase = {
      execute: async (input) => {
        received = input;
        return Result.ok({ sku: input.sku, quantityOnHand: 1 });
      },
    };
    const controller = createInventoryController(adjustStockUseCase);

    await controller.reserveStock({ params: { sku: 'ABC-123' }, body: { amount: 2 } });

    assert.deepEqual(received, { sku: 'ABC-123', amount: 2 });
  });
});
