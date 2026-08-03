'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { StockDepletedEvent } = require('./StockDepletedEvent');
const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

describe('StockDepletedEvent', () => {
  test('is a DomainEvent with eventType "inventory.stock-depleted"', () => {
    const event = new StockDepletedEvent('ABC-123');
    assert.ok(event instanceof DomainEvent);
    assert.equal(event.eventType, 'inventory.stock-depleted');
    assert.equal(event.sku, 'ABC-123');
    assert.ok(event.occurredAt instanceof Date);
    assert.equal(typeof event.eventId, 'string');
  });
});
