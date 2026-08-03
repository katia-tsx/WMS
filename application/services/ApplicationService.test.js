'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ApplicationService } = require('./ApplicationService');
const { AggregateRoot } = require('../../domain/shared-kernel/entities/AggregateRoot');
const { DomainEvent } = require('../../domain/shared-kernel/events/DomainEvent');

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

describe('ApplicationService', () => {
  test('requires a unitOfWork', () => {
    assert.throws(() => new ApplicationService({}));
  });
});

describe('ApplicationService#runInTransaction', () => {
  test('begins, runs work, commits, and returns work\'s value on success', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const service = new ApplicationService({ unitOfWork });

    const value = await service.runInTransaction(async () => 'workflow result');

    assert.equal(value, 'workflow result');
    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
  });

  test('rolls back and rethrows when work throws', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const service = new ApplicationService({ unitOfWork });

    await assert.rejects(
      () => service.runInTransaction(async () => { throw new Error('step 2 failed'); }),
      /step 2 failed/,
    );
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
  });

  test('a sequence of steps rolls back together if a later step fails', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const service = new ApplicationService({ unitOfWork });
    const completedSteps = [];

    await assert.rejects(() =>
      service.runInTransaction(async () => {
        completedSteps.push('step-1');
        completedSteps.push('step-2');
        throw new Error('step-3 failed');
      }),
    );

    // Both prior steps ran (this fake has no real storage to check), but
    // the unit of work was rolled back exactly once, after both ran.
    assert.deepEqual(completedSteps, ['step-1', 'step-2']);
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
  });
});

describe('ApplicationService#publishDomainEvents', () => {
  test('is a no-op when no eventPublisher was supplied', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const service = new ApplicationService({ unitOfWork });
    const aggregate = new TestAggregate('a-1');
    aggregate.raise('some.event');

    await assert.doesNotReject(() => service.publishDomainEvents(aggregate));
    assert.equal(aggregate.pullDomainEvents().length, 1); // untouched
  });

  test('flushes buffered events from one or more aggregates when an eventPublisher was supplied', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const eventPublisher = new RecordingEventPublisher();
    const service = new ApplicationService({ unitOfWork, eventPublisher });

    const first = new TestAggregate('a-1');
    first.raise('first.event');
    const second = new TestAggregate('a-2');
    second.raise('second.event');

    await service.publishDomainEvents([first, second]);

    assert.deepEqual(
      eventPublisher.publishedEvents.map((e) => e.eventType),
      ['first.event', 'second.event'],
    );
  });

  test('is meant to be called only after runInTransaction has already committed — a full workflow example', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const eventPublisher = new RecordingEventPublisher();
    const service = new ApplicationService({ unitOfWork, eventPublisher });
    const touched = [];

    await service.runInTransaction(async () => {
      const aggregate = new TestAggregate('a-1');
      aggregate.raise('workflow.step-completed');
      touched.push(aggregate);
    });
    await service.publishDomainEvents(touched);

    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
    assert.equal(eventPublisher.publishedEvents.length, 1);
  });

  test('events are never published when the workflow rolled back, because publishDomainEvents is never reached', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const eventPublisher = new RecordingEventPublisher();
    const service = new ApplicationService({ unitOfWork, eventPublisher });
    const touched = [];

    try {
      await service.runInTransaction(async () => {
        const aggregate = new TestAggregate('a-1');
        aggregate.raise('workflow.step-completed');
        touched.push(aggregate);
        throw new Error('later step failed');
      });
      await service.publishDomainEvents(touched); // never reached
    } catch {
      // expected: the workflow's own caller is responsible for not
      // calling publishDomainEvents after a caught rollback, exactly
      // like this try/catch demonstrates.
    }

    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
    assert.deepEqual(eventPublisher.publishedEvents, []);
  });
});
