'use strict';

/**
 * MaintenanceRecord Entity
 */
class MaintenanceRecord {
  constructor({ id, serviceType, odometerReading, serviceDate = new Date(), status = 'COMPLETED', notes = '' }) {
    if (!id) throw new Error('MaintenanceRecord requires id');
    if (!serviceType) throw new Error('MaintenanceRecord requires serviceType');

    this.id = id;
    this.serviceType = serviceType;
    this.odometerReading = odometerReading || 0;
    this.serviceDate = serviceDate instanceof Date ? serviceDate : new Date(serviceDate);
    this.status = status;
    this.notes = notes;
  }
}

module.exports = { MaintenanceRecord };
