'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ShipmentDispatchedEvent } = require('./ShipmentDispatchedEvent');
const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

describe('ShipmentDispatchedEvent', () => {
  test('is a DomainEvent carrying the shipment and order ids', () => {
    const event = new ShipmentDispatchedEvent('shipment-1', 'order-1');

    assert.ok(event instanceof DomainEvent);
    assert.equal(event.eventType, 'shipments.shipment-dispatched');
    assert.equal(event.shipmentId, 'shipment-1');
    assert.equal(event.orderId, 'order-1');
  });
});
