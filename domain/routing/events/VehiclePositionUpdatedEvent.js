'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class VehiclePositionUpdatedEvent extends DomainEvent {
  constructor({ vehicleId, routeId, latitude, longitude, speedKmH = 50, headingDegrees = 0, status = 'ON_TIME', timestamp = new Date() }) {
    super('routing.vehicle-position-updated');
    this.vehicleId = vehicleId;
    this.routeId = routeId;
    this.latitude = latitude;
    this.longitude = longitude;
    this.speedKmH = speedKmH;
    this.headingDegrees = headingDegrees;
    this.status = status;
    this.timestamp = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
  }
}

module.exports = { VehiclePositionUpdatedEvent };
