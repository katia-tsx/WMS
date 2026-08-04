'use strict';

const { IVehicleLocationSource } = require('../../../application/ports/IVehicleLocationSource');

/**
 * GpsDeviceGateway Adapter
 * Production implementation of IVehicleLocationSource receiving live hardware GPS device telematics.
 */
class GpsDeviceGateway extends IVehicleLocationSource {
  constructor() {
    super();
    this.subscribers = new Map();
  }

  subscribeToPositionUpdates(vehicleId, callback) {
    if (!this.subscribers.has(vehicleId)) {
      this.subscribers.set(vehicleId, []);
    }
    this.subscribers.get(vehicleId).push(callback);
  }

  receiveTelemetryFeed(vehicleId, payload) {
    const callbacks = this.subscribers.get(vehicleId) || [];
    for (const cb of callbacks) {
      cb({
        vehicleId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speedKmH: payload.speedKmH || 0,
        headingDegrees: payload.headingDegrees || 0,
        timestamp: payload.timestamp || new Date().toISOString(),
      });
    }
  }
}

module.exports = { GpsDeviceGateway };
