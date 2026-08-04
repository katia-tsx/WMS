'use strict';

const { VEHICLE_STATUSES } = require('../entities/Vehicle');

class VehicleUnavailableError extends Error {
  constructor(vehicleId, reason) {
    super(`Vehicle ${vehicleId} is unavailable: ${reason}`);
    this.name = 'VehicleUnavailableError';
    this.vehicleId = vehicleId;
    this.reason = reason;
  }
}

class DriverCertificationExpiredError extends Error {
  constructor(driverId, certExpiryDate) {
    super(`Driver ${driverId} certification expired on ${certExpiryDate.toISOString().split('T')[0]}`);
    this.name = 'DriverCertificationExpiredError';
    this.driverId = driverId;
    this.certExpiryDate = certExpiryDate;
  }
}

class VehicleAvailabilityService {
  /**
   * Asserts vehicle and assigned driver readiness for route assignment.
   * @param {import('../entities/Vehicle').Vehicle} vehicle
   * @param {number} [routeDemandWeight=0]
   * @param {Date} [now]
   */
  static assertAvailable(vehicle, routeDemandWeight = 0, now = new Date()) {
    if (!vehicle) throw new Error('VehicleAvailabilityService requires a vehicle instance');

    if (vehicle.status !== VEHICLE_STATUSES.AVAILABLE) {
      throw new VehicleUnavailableError(vehicle.id, `Current status is ${vehicle.status}`);
    }

    if (routeDemandWeight > vehicle.maxWeightKg) {
      throw new VehicleUnavailableError(
        vehicle.id,
        `Route demand weight (${routeDemandWeight} kg) exceeds max vehicle payload (${vehicle.maxWeightKg} kg)`
      );
    }

    if (vehicle.assignedDriver) {
      if (vehicle.assignedDriver.isCertificationExpired(now)) {
        throw new DriverCertificationExpiredError(vehicle.assignedDriver.id, vehicle.assignedDriver.certExpiryDate);
      }
    }
  }
}

module.exports = { VehicleAvailabilityService, VehicleUnavailableError, DriverCertificationExpiredError };
