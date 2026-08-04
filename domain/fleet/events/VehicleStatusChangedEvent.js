'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class VehicleStatusChangedEvent extends DomainEvent {
  constructor(vehicle, previousStatus) {
    super('fleet.vehicle-status-changed');
    this.vehicleId = vehicle.id;
    this.licensePlate = vehicle.licensePlate;
    this.previousStatus = previousStatus;
    this.newStatus = vehicle.status;
  }
}

module.exports = { VehicleStatusChangedEvent };
