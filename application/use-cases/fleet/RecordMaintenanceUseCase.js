'use strict';

const { UseCase } = require('../UseCase');
const { VehicleStatusChangedEvent } = require('../../../domain/fleet/events/VehicleStatusChangedEvent');

class RecordMaintenanceUseCase extends UseCase {
  constructor({ vehicleRepository, eventPublisher }) {
    super();
    this.vehicleRepository = vehicleRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ vehicleId, serviceType, odometerReading, notes }) {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

    const prevStatus = vehicle.status;
    const recId = `maint-${vehicle.id}-${vehicle.maintenanceRecords.length + 1}`;

    vehicle.completeMaintenance({
      id: recId,
      serviceType: serviceType || 'Scheduled Inspection',
      odometerReading: odometerReading || vehicle.odometerReading,
      serviceDate: new Date(),
      status: 'COMPLETED',
      notes: notes || '',
    });

    await this.vehicleRepository.save(vehicle);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new VehicleStatusChangedEvent(vehicle, prevStatus));
    }

    return {
      vehicleId: vehicle.id,
      status: vehicle.status,
      odometerReading: vehicle.odometerReading,
      recordId: recId,
    };
  }
}

module.exports = { RecordMaintenanceUseCase };
