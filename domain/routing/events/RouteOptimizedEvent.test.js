'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { RouteOptimizedEvent } = require('./RouteOptimizedEvent');
const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

describe('RouteOptimizedEvent', () => {
  test('is a DomainEvent carrying the route id, stop order, and total distance', () => {
    const event = new RouteOptimizedEvent('route-1', ['stop-a', 'stop-b'], 12000);

    assert.ok(event instanceof DomainEvent);
    assert.equal(event.eventType, 'routing.route-optimized');
    assert.equal(event.routeId, 'route-1');
    assert.deepEqual(event.orderedStopIds, ['stop-a', 'stop-b']);
    assert.equal(event.totalDistanceMeters, 12000);
  });
});
