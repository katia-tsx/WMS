'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { AggregateRoot } = require('./AggregateRoot');
const { DomainEvent } = require('../events/DomainEvent');

class TestOrder extends AggregateRoot {
  constructor(id) {
    super(id);
  }

  place() {
    this.addDomainEvent(new DomainEvent('order.placed'));
  }
}

describe('AggregateRoot', () => {
  test('starts with no buffered domain events', () => {
    const order = new TestOrder('o-1');
    assert.deepEqual(order.pullDomainEvents(), []);
  });

  test('buffers domain events added by behavior', () => {
    const order = new TestOrder('o-1');
    order.place();
    const events = order.pullDomainEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, 'order.placed');
  });

  test('pullDomainEvents clears the buffer so events are not delivered twice', () => {
    const order = new TestOrder('o-1');
    order.place();
    order.pullDomainEvents();
    assert.deepEqual(order.pullDomainEvents(), []);
  });

  test('inherits identity-based equality from Entity', () => {
    const a = new TestOrder('o-1');
    const b = new TestOrder('o-1');
    assert.equal(a.equals(b), true);
  });
});
