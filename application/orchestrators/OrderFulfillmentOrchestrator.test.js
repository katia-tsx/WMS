'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { OrderFulfillmentOrchestrator } = require('./OrderFulfillmentOrchestrator');
const { Result } = require('../../domain/shared-kernel/result/Result');
const { NotFoundError } = require('../../domain/shared-kernel/errors/DomainError');

/**
 * A minimal in-application fake unit of work: just records begin/commit/
 * rollback calls, with no real storage to snapshot. Proving that storage
 * really does roll back end to end (not just that these three methods
 * were called in the right order) is done against the real
 * InMemoryUnitOfWork + InMemoryInventoryRepository wiring, in
 * infrastructure/di/CompositionRoot.test.js — this file only tests
 * OrderFulfillmentOrchestrator's own control flow, so it stays inside
 * application/ and never imports a concrete infrastructure/ adapter (see
 * ARCHITECTURE.md §2).
 */
class RecordingUnitOfWork {
  constructor() {
    this.calls = [];
  }
  async begin() { this.calls.push('begin'); }
  async commit() { this.calls.push('commit'); }
  async rollback() { this.calls.push('rollback'); }
}

function fakeAdjustStockUseCase(resultsBySku) {
  return {
    calls: [],
    async execute(input) {
      this.calls.push(input);
      return resultsBySku(input);
    },
  };
}

describe('OrderFulfillmentOrchestrator', () => {
  test('runs every line through adjustStockUseCase and commits on success', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const adjustStockUseCase = fakeAdjustStockUseCase((input) => Result.ok({ sku: input.sku, quantityOnHand: 6 }));
    const orchestrator = new OrderFulfillmentOrchestrator({ adjustStockUseCase, unitOfWork });

    const order = { lines: [{ sku: 'A', quantity: 4 }, { sku: 'B', quantity: 3 }] };
    const result = await orchestrator.fulfill(order);

    assert.equal(result.isOk, true);
    assert.equal(result.value, order);
    assert.deepEqual(
      adjustStockUseCase.calls,
      [{ sku: 'A', amount: 4 }, { sku: 'B', amount: 3 }],
    );
    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
  });

  test('stops at the first failing line, rolls back, and returns Result.err with that line\'s error', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const adjustStockUseCase = fakeAdjustStockUseCase((input) => {
      if (input.sku === 'B') {
        return Result.err(new NotFoundError('No product found for sku "B".'));
      }
      return Result.ok({ sku: input.sku, quantityOnHand: 6 });
    });
    const orchestrator = new OrderFulfillmentOrchestrator({ adjustStockUseCase, unitOfWork });

    const result = await orchestrator.fulfill({
      lines: [{ sku: 'A', quantity: 4 }, { sku: 'B', quantity: 1 }, { sku: 'C', quantity: 1 }],
    });

    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof NotFoundError);
    // Line C never ran: the loop stopped as soon as B failed.
    assert.deepEqual(adjustStockUseCase.calls, [{ sku: 'A', amount: 4 }, { sku: 'B', amount: 1 }]);
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
  });
});
