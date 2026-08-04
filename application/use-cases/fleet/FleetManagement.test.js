'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { Vehicle, VEHICLE_STATUSES } = require('../../../domain/fleet/entities/Vehicle');
const { Driver } = require('../../../domain/fleet/entities/Driver');
const { MaintenanceRecord } = require('../../../domain/fleet/entities/MaintenanceRecord');
const {
  VehicleAvailabilityService,
  VehicleUnavailableError,
  DriverCertificationExpiredError,
} = require('../../../domain/fleet/services/VehicleAvailabilityService');
const { MaintenanceScheduler } = require('../../../domain/fleet/services/MaintenanceScheduler');

const { RecordMaintenanceUseCase } = require('./RecordMaintenanceUseCase');
const { ScheduleMaintenanceUseCase } = require('./ScheduleMaintenanceUseCase');
const { CheckVehicleAvailabilityUseCase } = require('./CheckVehicleAvailabilityUseCase');

describe('Fleet Vehicle & Driver Entities', () => {
  it('manages vehicle status, odometer readings, and assigned driver', () => {
    const driver = new Driver({
      id: 'd1',
      name: 'John Doe',
      certExpiryDate: new Date('2027-01-01'),
    });

    const vehicle = new Vehicle({
      id: 'v1',
      licensePlate: 'TX-100',
      maxWeightKg: 1000,
      assignedDriver: driver,
    });

    assert.equal(vehicle.status, 'AVAILABLE');
    assert.equal(vehicle.assignedDriver.name, 'John Doe');
    assert.equal(driver.isCertificationExpired(new Date('2026-01-01')), false);
  });
});

describe('VehicleAvailabilityService Domain Rules', () => {
  it('rejects vehicle in maintenance or out of service', () => {
    const vMaint = new Vehicle({ id: 'v-maint', licensePlate: 'TX-200', status: VEHICLE_STATUSES.IN_MAINTENANCE });
    assert.throws(() => VehicleAvailabilityService.assertAvailable(vMaint, 100), VehicleUnavailableError);
  });

  it('rejects route demand weight exceeding vehicle capacity', () => {
    const vOverload = new Vehicle({ id: 'v-cap', licensePlate: 'TX-300', maxWeightKg: 500 });
    assert.throws(() => VehicleAvailabilityService.assertAvailable(vOverload, 600), VehicleUnavailableError);
  });

  it('rejects vehicle when assigned driver certification is expired', () => {
    const expiredDriver = new Driver({ id: 'd-exp', name: 'Bob', certExpiryDate: new Date('2025-01-01') });
    const vExpiredDriver = new Vehicle({ id: 'v-exp', licensePlate: 'TX-400', assignedDriver: expiredDriver });

    assert.throws(() => VehicleAvailabilityService.assertAvailable(vExpiredDriver, 100), DriverCertificationExpiredError);
  });
});

describe('MaintenanceScheduler & Fleet Use Cases', () => {
  it('MaintenanceScheduler triggers maintenance due when odometer threshold is exceeded', async () => {
    const publishedEvents = [];
    const mockEventPublisher = { publish: async (evt) => publishedEvents.push(evt) };
    const scheduler = new MaintenanceScheduler({ eventPublisher: mockEventPublisher, odoThresholdKm: 10000 });

    const vehicle = new Vehicle({ id: 'v-odo', licensePlate: 'TX-500', odometerReading: 12000 });
    const res = await scheduler.checkAndSchedule(vehicle);

    assert.equal(res.isDue, true);
    assert.equal(vehicle.status, 'IN_MAINTENANCE');
    assert.equal(publishedEvents.length, 1);
    assert.equal(publishedEvents[0].eventType, 'fleet.maintenance-due');
  });

  it('RecordMaintenanceUseCase logs maintenance record and restores vehicle status to AVAILABLE', async () => {
    const vehicle = new Vehicle({ id: 'v-rec', licensePlate: 'TX-600', status: VEHICLE_STATUSES.IN_MAINTENANCE, odometerReading: 15000 });
    const mockRepo = {
      findById: async (id) => (id === 'v-rec' ? vehicle : null),
      save: async () => {},
    };

    const useCase = new RecordMaintenanceUseCase({ vehicleRepository: mockRepo });
    const res = await useCase.execute({
      vehicleId: 'v-rec',
      serviceType: 'Full Synthetic Oil Change',
      odometerReading: 15000,
    });

    assert.equal(res.status, 'AVAILABLE');
    assert.equal(vehicle.status, 'AVAILABLE');
    assert.equal(vehicle.maintenanceRecords.length, 1);
  });

  it('CheckVehicleAvailabilityUseCase returns availability result', async () => {
    const vehicle = new Vehicle({ id: 'v-chk', licensePlate: 'TX-700', maxWeightKg: 1500 });
    const mockRepo = { findById: async (id) => (id === 'v-chk' ? vehicle : null) };

    const useCase = new CheckVehicleAvailabilityUseCase({ vehicleRepository: mockRepo });
    const okRes = await useCase.execute({ vehicleId: 'v-chk', routeDemandWeight: 1000 });
    assert.equal(okRes.isAvailable, true);

    const failRes = await useCase.execute({ vehicleId: 'v-chk', routeDemandWeight: 2000 });
    assert.equal(failRes.isAvailable, false);
  });
});
