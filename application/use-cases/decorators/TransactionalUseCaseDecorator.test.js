'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { TransactionalUseCaseDecorator } = require('./TransactionalUseCaseDecorator');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { BusinessRuleViolationError } = require('../../../domain/shared-kernel/errors/DomainError');
const { AggregateRoot } = require('../../../domain/shared-kernel/entities/AggregateRoot');
const { DomainEvent } = require('../../../domain/shared-kernel/events/DomainEvent');

class TestAggregate extends AggregateRoot {
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

describe('TransactionalUseCaseDecorator — event flushing', () => {
  test('with no eventPublisher supplied, no attempt is made to flush events (backward compatible)', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const aggregate = new TestAggregate('a-1');
    aggregate.raise('inventory.stock-depleted');
    const inner = { execute: async () => Result.ok(aggregate) };
    const decorator = new TransactionalUseCaseDecorator(inner, { unitOfWork });

    const result = await decorator.execute({});

    assert.equal(result.isOk, true);
    // The aggregate's events are untouched — nobody asked for them.
    assert.equal(aggregate.pullDomainEvents().length, 1);
  });

  test('flushes and publishes the returned aggregate\'s buffered events only after commit', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const eventPublisher = new RecordingEventPublisher();
    const aggregate = new TestAggregate('a-1');
    aggregate.raise('inventory.stock-depleted');
    const inner = { execute: async () => Result.ok(aggregate) };
    const decorator = new TransactionalUseCaseDecorator(inner, { unitOfWork, eventPublisher });

    const result = await decorator.execute({});

    assert.equal(result.isOk, true);
    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
    assert.equal(eventPublisher.publishedEvents.length, 1);
    assert.equal(eventPublisher.publishedEvents[0].eventType, 'inventory.stock-depleted');
    // The aggregate's own buffer is drained once flushed.
    assert.deepEqual(aggregate.pullDomainEvents(), []);
  });

  test('prevents event leakage on rollback: a Result.err never flushes the aggregate\'s buffered events', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const eventPublisher = new RecordingEventPublisher();
    const aggregate = new TestAggregate('a-1');
    aggregate.raise('inventory.stock-depleted');
    // A use case can legitimately record events on an aggregate and still
    // return Result.err (e.g. a later validation step in `handle` failed)
    // — those events must never reach the publisher.
    const inner = { execute: async () => Result.err(new BusinessRuleViolationError('nope')) };
    const decorator = new TransactionalUseCaseDecorator(inner, { unitOfWork, eventPublisher });

    const result = await decorator.execute({});

    assert.equal(result.isErr, true);
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
    assert.deepEqual(eventPublisher.publishedEvents, []);
  });

  test('prevents event leakage when the inner use case throws: rollback happens and nothing is published', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const eventPublisher = new RecordingEventPublisher();
    const inner = { execute: async () => { throw new TypeError('boom'); } };
    const decorator = new TransactionalUseCaseDecorator(inner, { unitOfWork, eventPublisher });

    await assert.rejects(() => decorator.execute({}), TypeError);

    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
    assert.deepEqual(eventPublisher.publishedEvents, []);
  });
});
