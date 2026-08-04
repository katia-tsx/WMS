'use strict';

const { MaintenanceDueEvent } = require('../events/MaintenanceDueEvent');

class MaintenanceScheduler {
  constructor({ eventPublisher, odoThresholdKm = 10000, daysThreshold = 180 } = {}) {
    this.eventPublisher = eventPublisher;
    this.odoThresholdKm = odoThresholdKm;
    this.daysThreshold = daysThreshold;
  }

  /**
   * Checks if vehicle service is due and emits event if threshold exceeded.
   * @param {import('../entities/Vehicle').Vehicle} vehicle
   * @param {Date} [now]
   * @returns {Promise<{ isDue: boolean, reason?: string }>}
   */
  async checkAndSchedule(vehicle, now = new Date()) {
    const lastRecord = vehicle.maintenanceRecords[vehicle.maintenanceRecords.length - 1];
    const lastOdo = lastRecord ? lastRecord.odometerReading : 0;
    const lastDate = lastRecord ? lastRecord.serviceDate : new Date(0);

    const odoDelta = vehicle.odometerReading - lastOdo;
    const daysDelta = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    let isDue = false;
    let reason = '';

    if (odoDelta >= this.odoThresholdKm) {
      isDue = true;
      reason = `Odometer threshold exceeded: ${odoDelta} km driven since last service (threshold: ${this.odoThresholdKm} km)`;
    } else if (daysDelta >= this.daysThreshold) {
      isDue = true;
      reason = `Time threshold exceeded: ${daysDelta} days since last service (threshold: ${this.daysThreshold} days)`;
    }

    if (isDue) {
      vehicle.setMaintenanceState();
      if (this.eventPublisher) {
        await this.eventPublisher.publish(new MaintenanceDueEvent(vehicle, reason));
      }
    }

    return { isDue, reason };
  }
}

module.exports = { MaintenanceScheduler };
