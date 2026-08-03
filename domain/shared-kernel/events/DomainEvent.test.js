'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { DomainEvent } = require('./DomainEvent');

describe('DomainEvent', () => {
  test('requires a non-empty eventType', () => {
    assert.throws(() => new DomainEvent(''), /must not be an empty string/);
    assert.throws(() => new DomainEvent(undefined), /is required/);
  });

  test('stamps eventId, eventType, and occurredAt', () => {
    const event = new DomainEvent('inventory.stock-depleted');
    assert.equal(event.eventType, 'inventory.stock-depleted');
    assert.equal(typeof event.eventId, 'string');
    assert.ok(event.eventId.length > 0);
    assert.ok(event.occurredAt instanceof Date);
  });

  test('each instance gets a distinct eventId', () => {
    const a = new DomainEvent('x');
    const b = new DomainEvent('x');
    assert.notEqual(a.eventId, b.eventId);
  });
});
