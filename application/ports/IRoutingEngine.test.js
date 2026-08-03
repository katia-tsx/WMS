'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IRoutingEngine } = require('./IRoutingEngine');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('IRoutingEngine (base contract)', () => {
  test('planRoute rejects with NotImplementedError when not overridden', async () => {
    const engine = new IRoutingEngine();
    await assert.rejects(() => engine.planRoute([{ lat: 0, lng: 0 }]), NotImplementedError);
  });
});

describe('IRoutingEngine (fake adapter)', () => {
  class FakeRoutingEngine extends IRoutingEngine {
    async planRoute(stops) {
      return { orderedStops: stops, totalDistanceMeters: 0, totalDurationSeconds: 0 };
    }
  }

  test('a fake adapter returns a deterministic route for a use case test', async () => {
    const engine = new FakeRoutingEngine();
    const stops = [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }];
    const route = await engine.planRoute(stops);
    assert.deepEqual(route, { orderedStops: stops, totalDistanceMeters: 0, totalDurationSeconds: 0 });
  });
});
