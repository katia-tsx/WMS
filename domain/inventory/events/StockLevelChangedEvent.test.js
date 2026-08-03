'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { StockLevelChangedEvent } = require('./StockLevelChangedEvent');
const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

describe('StockLevelChangedEvent', () => {
  test('is a DomainEvent carrying the previous and new quantity', () => {
    const event = new StockLevelChangedEvent('ABC-123', 10, 6);
    assert.ok(event instanceof DomainEvent);
    assert.equal(event.eventType, 'inventory.stock-level-changed');
    assert.equal(event.sku, 'ABC-123');
    assert.equal(event.previousQuantityOnHand, 10);
    assert.equal(event.newQuantityOnHand, 6);
  });
});
