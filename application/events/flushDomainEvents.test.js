'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { flushDomainEvents } = require('./flushDomainEvents');
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

describe('flushDomainEvents', () => {
  test('publishes a single aggregate\'s buffered events, in order, and clears its buffer', async () => {
    const aggregate = new TestAggregate('a-1');
    aggregate.raise('a');
    aggregate.raise('b');
    const publisher = new RecordingEventPublisher();

    await flushDomainEvents(aggregate, publisher);

    assert.deepEqual(publisher.publishedEvents.map((e) => e.eventType), ['a', 'b']);
    assert.deepEqual(aggregate.pullDomainEvents(), []);
  });

  test('publishes events from an array of aggregates, preserving aggregate order and per-aggregate event order', async () => {
    const first = new TestAggregate('a-1');
    first.raise('first-a');
    first.raise('first-b');
    const second = new TestAggregate('a-2');
    second.raise('second-a');
    const publisher = new RecordingEventPublisher();

    await flushDomainEvents([first, second], publisher);

    assert.deepEqual(
      publisher.publishedEvents.map((e) => e.eventType),
      ['first-a', 'first-b', 'second-a'],
    );
  });

  test('tolerates non-aggregate values mixed into an array, publishing nothing for them', async () => {
    const aggregate = new TestAggregate('a-1');
    aggregate.raise('only-event');
    const publisher = new RecordingEventPublisher();

    await flushDomainEvents([aggregate, { plain: 'dto' }, null, undefined], publisher);

    assert.deepEqual(publisher.publishedEvents.map((e) => e.eventType), ['only-event']);
  });

  test('publishes nothing for a value with no buffered events, or no pullDomainEvents at all', async () => {
    const aggregate = new TestAggregate('a-1'); // never raised anything
    const publisher = new RecordingEventPublisher();

    await flushDomainEvents(aggregate, publisher);
    await flushDomainEvents({ plain: 'dto' }, publisher);
    await flushDomainEvents(undefined, publisher);

    assert.deepEqual(publisher.publishedEvents, []);
  });
});
