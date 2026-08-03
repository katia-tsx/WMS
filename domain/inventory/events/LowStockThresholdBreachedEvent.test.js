'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { LowStockThresholdBreachedEvent } = require('./LowStockThresholdBreachedEvent');
const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

describe('LowStockThresholdBreachedEvent', () => {
  test('is a DomainEvent carrying the quantity and the threshold it crossed', () => {
    const event = new LowStockThresholdBreachedEvent('ABC-123', 4, 5);
    assert.ok(event instanceof DomainEvent);
    assert.equal(event.eventType, 'inventory.low-stock-threshold-breached');
    assert.equal(event.sku, 'ABC-123');
    assert.equal(event.quantityOnHand, 4);
    assert.equal(event.reorderThreshold, 5);
  });
});
