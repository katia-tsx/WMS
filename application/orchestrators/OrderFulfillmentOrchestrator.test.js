'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { OrderFulfillmentOrchestrator } = require('./OrderFulfillmentOrchestrator');
const { Result } = require('../../domain/shared-kernel/result/Result');
const { NotFoundError } = require('../../domain/shared-kernel/errors/DomainError');
const { AggregateRoot } = require('../../domain/shared-kernel/entities/AggregateRoot');
const { DomainEvent } = require('../../domain/shared-kernel/events/DomainEvent');

class TestAggregate extends AggregateRoot {
  constructor(id) {
    super(id);
    this.raise('test.line-processed');
  }
  raise(eventType) {
    this.addDomainEvent(new DomainEvent(eventType));
  }
}

class RecordingEventPublisher {
  constructor() {
    this.publishedEvents = [];
  }
  async publish(event) {
    this.publishedEvents.push(event);
  }
  async publishAll(events) {
    for (const event of events) await this.publish(event);
  }
}

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

describe('OrderFulfillmentOrchestrator — event flushing', () => {
  test('publishes buffered events for every touched aggregate only after the workflow commits', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const eventPublisher = new RecordingEventPublisher();
    const adjustStockUseCase = fakeAdjustStockUseCase((input) => Result.ok(new TestAggregate(input.sku)));
    const orchestrator = new OrderFulfillmentOrchestrator({ adjustStockUseCase, unitOfWork, eventPublisher });

    const result = await orchestrator.fulfill({
      lines: [{ sku: 'A', quantity: 4 }, { sku: 'B', quantity: 3 }],
    });

    assert.equal(result.isOk, true);
    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
    assert.equal(eventPublisher.publishedEvents.length, 2);
  });

  test('prevents event leakage on rollback: a failing line publishes nothing, for any line', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const eventPublisher = new RecordingEventPublisher();
    const adjustStockUseCase = fakeAdjustStockUseCase((input) => {
      if (input.sku === 'B') {
        return Result.err(new NotFoundError('No product found for sku "B".'));
      }
      return Result.ok(new TestAggregate(input.sku));
    });
    const orchestrator = new OrderFulfillmentOrchestrator({ adjustStockUseCase, unitOfWork, eventPublisher });

    const result = await orchestrator.fulfill({
      lines: [{ sku: 'A', quantity: 4 }, { sku: 'B', quantity: 1 }],
    });

    assert.equal(result.isErr, true);
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
    // Line A succeeded and buffered an event before B failed, but because
    // the whole workflow rolled back, publishDomainEvents is never
    // reached — nothing was published.
    assert.deepEqual(eventPublisher.publishedEvents, []);
  });
});
