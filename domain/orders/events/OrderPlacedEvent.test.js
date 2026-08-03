'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { OrderPlacedEvent } = require('./OrderPlacedEvent');
const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

describe('OrderPlacedEvent', () => {
  test('is a DomainEvent carrying the order id and lines', () => {
    const lines = [{ sku: 'ABC-123', quantity: 2 }];
    const event = new OrderPlacedEvent('order-1', lines);

    assert.ok(event instanceof DomainEvent);
    assert.equal(event.eventType, 'orders.order-placed');
    assert.equal(event.orderId, 'order-1');
    assert.equal(event.lines, lines);
  });
});
