'use strict';

/**
 * Swappable IVehicleLocationSource Port Interface
 * Abstracting vehicle position sources (simulation engine vs hardware GPS device gateway).
 */
class IVehicleLocationSource {
  /**
   * Subscribes to position updates for a vehicle.
   * @param {string} vehicleId
   * @param {Function} callback - (positionUpdate) => void
   */
  subscribeToPositionUpdates(vehicleId, callback) {
    throw new Error('IVehicleLocationSource#subscribeToPositionUpdates must be implemented by subclass');
  }
}

module.exports = { IVehicleLocationSource };
