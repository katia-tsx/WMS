'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { EventBus } = require('./EventBus');
const { DomainEvent } = require('../../domain/shared-kernel/events/DomainEvent');

class FakeEvent extends DomainEvent {
  constructor(eventType, payload = {}) {
    super(eventType);
    Object.assign(this, payload);
  }
}

describe('EventBus#subscribe / #publish — exact and wildcard topics', () => {
  test('delivers an event only to subscribers whose exact topic matches', async () => {
    const bus = new EventBus();
    const receivedByA = [];
    const receivedByB = [];
    bus.subscribe('inventory.stock-depleted', (e) => receivedByA.push(e));
    bus.subscribe('inventory.stock-level-changed', (e) => receivedByB.push(e));

    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.equal(receivedByA.length, 1);
    assert.equal(receivedByB.length, 0);
  });

  test('a namespace wildcard ("inventory.*") matches every event in that namespace, and nothing else', async () => {
    const bus = new EventBus();
    const received = [];
    bus.subscribe('inventory.*', (e) => received.push(e.eventType));

    await bus.publish(new FakeEvent('inventory.stock-depleted'));
    await bus.publish(new FakeEvent('inventory.low-stock-threshold-breached'));
    await bus.publish(new FakeEvent('orders.order-placed'));

    assert.deepEqual(received, ['inventory.stock-depleted', 'inventory.low-stock-threshold-breached']);
  });

  test('a bare "*" matches every event regardless of namespace', async () => {
    const bus = new EventBus();
    const received = [];
    bus.subscribe('*', (e) => received.push(e.eventType));

    await bus.publish(new FakeEvent('inventory.stock-depleted'));
    await bus.publish(new FakeEvent('orders.order-placed'));

    assert.deepEqual(received, ['inventory.stock-depleted', 'orders.order-placed']);
  });

  test('unsubscribe stops further delivery to that handler', async () => {
    const bus = new EventBus();
    const received = [];
    const unsubscribe = bus.subscribe('inventory.*', (e) => received.push(e));

    await bus.publish(new FakeEvent('inventory.stock-depleted'));
    unsubscribe();
    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.equal(received.length, 1);
  });
});

describe('EventBus — sync vs async subscriber ordering', () => {
  test('sync subscribers all complete, in registration order, before publish() resolves', async () => {
    const bus = new EventBus();
    const order = [];
    bus.subscribe('inventory.*', async (e) => { await Promise.resolve(); order.push('sync-1'); }, { mode: 'sync' });
    bus.subscribe('inventory.*', async (e) => { order.push('sync-2'); }, { mode: 'sync' });

    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.deepEqual(order, ['sync-1', 'sync-2']);
  });

  test('async subscribers are all awaited by publish() too (so tests can assert on their effects), just not order-guaranteed relative to each other', async () => {
    const bus = new EventBus();
    const seen = new Set();
    bus.subscribe('inventory.*', () => seen.add('a'), { mode: 'async' });
    bus.subscribe('inventory.*', () => seen.add('b'), { mode: 'async' });

    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.deepEqual(seen, new Set(['a', 'b']));
  });
});

describe('EventBus — a failing subscriber does not block other subscribers', () => {
  test('among async subscribers, one that always fails does not prevent the others from receiving the event', async () => {
    const bus = new EventBus({ maxRetries: 0, initialDelayMs: 0 });
    const goodReceived = [];

    bus.subscribe('inventory.*', () => { throw new Error('boom'); }, { mode: 'async' });
    bus.subscribe('inventory.*', (e) => goodReceived.push(e), { mode: 'async' });

    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.equal(goodReceived.length, 1);
    assert.equal(bus.deadLetterQueue.length, 1);
  });

  test('among sync subscribers, one that always fails still lets subsequent sync subscribers run', async () => {
    const bus = new EventBus({ maxRetries: 0, initialDelayMs: 0 });
    const order = [];

    bus.subscribe('inventory.*', () => { order.push('first'); throw new Error('boom'); }, { mode: 'sync' });
    bus.subscribe('inventory.*', () => { order.push('second'); }, { mode: 'sync' });

    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.deepEqual(order, ['first', 'second']);
  });

  test('publish() itself never rejects because a subscriber failed, even after exhausting retries', async () => {
    const bus = new EventBus({ maxRetries: 1, initialDelayMs: 0 });
    bus.subscribe('inventory.*', () => { throw new Error('always fails'); });

    await assert.doesNotReject(() => bus.publish(new FakeEvent('inventory.stock-depleted')));
  });
});

describe('EventBus — retry with backoff, and exactly-once delivery per publish', () => {
  test('a subscriber that fails twice then succeeds is retried with increasing delay and ultimately delivered once', async () => {
    const bus = new EventBus({ maxRetries: 3, initialDelayMs: 5 });
    let attempts = 0;
    const delaysBetweenAttempts = [];
    let lastAttemptAt = Date.now();

    bus.subscribe('inventory.*', () => {
      const now = Date.now();
      delaysBetweenAttempts.push(now - lastAttemptAt);
      lastAttemptAt = now;
      attempts += 1;
      if (attempts <= 2) throw new Error(`transient failure #${attempts}`);
    });

    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.equal(attempts, 3); // 2 failures + 1 success
    assert.equal(bus.deadLetterQueue.length, 0);
    // Backoff roughly doubles: second gap should be at least as long as the first.
    assert.ok(delaysBetweenAttempts[2] >= delaysBetweenAttempts[1]);
  });

  test('exceeding maxRetries dead-letters the event with the final error, attempt count, and topic pattern', async () => {
    const bus = new EventBus({ maxRetries: 2, initialDelayMs: 0 });
    let attempts = 0;

    bus.subscribe('inventory.*', () => {
      attempts += 1;
      throw new Error('permanently broken');
    });

    const event = new FakeEvent('inventory.stock-depleted');
    await bus.publish(event);

    assert.equal(attempts, 3); // initial attempt + 2 retries
    assert.equal(bus.deadLetterQueue.length, 1);
    const entry = bus.deadLetterQueue[0];
    assert.equal(entry.event, event);
    assert.equal(entry.attempts, 3);
    assert.equal(entry.pattern, 'inventory.*');
    assert.match(entry.error.message, /permanently broken/);
  });

  test('retrying one failing subscriber never causes another subscriber to receive the event more than once', async () => {
    const bus = new EventBus({ maxRetries: 2, initialDelayMs: 0 });
    let flakyAttempts = 0;
    let reliableCalls = 0;

    bus.subscribe('inventory.*', () => {
      flakyAttempts += 1;
      if (flakyAttempts < 2) throw new Error('transient');
    });
    bus.subscribe('inventory.*', () => { reliableCalls += 1; });

    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.equal(flakyAttempts, 2); // retried once for itself
    assert.equal(reliableCalls, 1); // never duplicated because a sibling retried
  });

  test('a single publish() call never re-invokes a subscriber beyond its own retry budget, i.e. the event is not "replayed" from the top', async () => {
    const bus = new EventBus({ maxRetries: 5, initialDelayMs: 0 });
    let publishCallCount = 0;
    let handlerCallCount = 0;

    bus.subscribe('inventory.*', () => {
      handlerCallCount += 1;
      // succeeds on the very first attempt
    });

    publishCallCount += 1;
    await bus.publish(new FakeEvent('inventory.stock-depleted'));

    assert.equal(publishCallCount, 1);
    assert.equal(handlerCallCount, 1); // exactly once — no duplication despite a generous retry budget
  });
});

describe('EventBus#publishAll', () => {
  test('publishes every event, in order, to matching subscribers', async () => {
    const bus = new EventBus();
    const received = [];
    bus.subscribe('inventory.*', (e) => received.push(e.eventType));

    await bus.publishAll([
      new FakeEvent('inventory.stock-depleted'),
      new FakeEvent('inventory.stock-level-changed'),
    ]);

    assert.deepEqual(received, ['inventory.stock-depleted', 'inventory.stock-level-changed']);
  });
});

describe('EventBus#publish — input validation', () => {
  test('rejects a null/undefined event', async () => {
    const bus = new EventBus();
    await assert.rejects(() => bus.publish(null));
  });

  test('rejects an event with no eventType', async () => {
    const bus = new EventBus();
    await assert.rejects(() => bus.publish({}));
  });
});
