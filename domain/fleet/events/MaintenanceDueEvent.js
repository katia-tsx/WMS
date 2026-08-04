'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class MaintenanceDueEvent extends DomainEvent {
  constructor(vehicle, reason) {
    super('fleet.maintenance-due');
    this.vehicleId = vehicle.id;
    this.licensePlate = vehicle.licensePlate;
    this.odometerReading = vehicle.odometerReading;
    this.reason = reason;
  }
}

module.exports = { MaintenanceDueEvent };
