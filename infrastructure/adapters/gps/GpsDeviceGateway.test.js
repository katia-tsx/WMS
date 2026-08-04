'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { GpsDeviceGateway } = require('./GpsDeviceGateway');

describe('GpsDeviceGateway Hardware Adapter', () => {
  it('dispatches telemetry feed to subscribed vehicle listeners', () => {
    const gateway = new GpsDeviceGateway();
    let received = null;

    gateway.subscribeToPositionUpdates('veh-99', (pos) => {
      received = pos;
    });

    gateway.receiveTelemetryFeed('veh-99', {
      latitude: 30.2672,
      longitude: -97.7431,
      speedKmH: 60,
      headingDegrees: 90,
    });

    assert.ok(received !== null);
    assert.equal(received.vehicleId, 'veh-99');
    assert.equal(received.latitude, 30.2672);
  });
});
