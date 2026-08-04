'use strict';

const { AggregateRoot } = require('../../shared-kernel/entities/AggregateRoot');
const { Driver } = require('./Driver');
const { MaintenanceRecord } = require('./MaintenanceRecord');

const VEHICLE_STATUSES = {
  AVAILABLE: 'AVAILABLE',
  ON_ROUTE: 'ON_ROUTE',
  IN_MAINTENANCE: 'IN_MAINTENANCE',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
};

class Vehicle extends AggregateRoot {
  constructor({
    id,
    licensePlate,
    maxWeightKg = 1000,
    maxVolumeCuM = 15,
    fuelType = 'DIESEL',
    odometerReading = 0,
    status = VEHICLE_STATUSES.AVAILABLE,
    maintenanceRecords = [],
    assignedDriver = null,
  }) {
    super(id);
    if (!licensePlate) throw new Error('Vehicle requires licensePlate');

    this.licensePlate = licensePlate;
    this.maxWeightKg = maxWeightKg;
    this.maxVolumeCuM = maxVolumeCuM;
    this.fuelType = fuelType;
    this.odometerReading = odometerReading;
    this.status = status;
    this.maintenanceRecords = maintenanceRecords.map((m) => (m instanceof MaintenanceRecord ? m : new MaintenanceRecord(m)));
    this.assignedDriver = assignedDriver ? (assignedDriver instanceof Driver ? assignedDriver : new Driver(assignedDriver)) : null;
  }

  assignDriver(driver) {
    this.assignedDriver = driver instanceof Driver ? driver : new Driver(driver);
  }

  updateOdometer(newReading) {
    if (newReading < this.odometerReading) {
      throw new Error('Odometer reading cannot decrease');
    }
    this.odometerReading = newReading;
  }

  setMaintenanceState() {
    this.status = VEHICLE_STATUSES.IN_MAINTENANCE;
  }

  completeMaintenance(record) {
    const rec = record instanceof MaintenanceRecord ? record : new MaintenanceRecord(record);
    this.maintenanceRecords.push(rec);
    if (rec.odometerReading > this.odometerReading) {
      this.odometerReading = rec.odometerReading;
    }
    this.status = VEHICLE_STATUSES.AVAILABLE;
  }
}

module.exports = { VEHICLE_STATUSES, Vehicle };
