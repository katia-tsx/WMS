'use strict';

const { UseCase } = require('../UseCase');

class ScheduleMaintenanceUseCase extends UseCase {
  constructor({ vehicleRepository, maintenanceScheduler }) {
    super();
    this.vehicleRepository = vehicleRepository;
    this.maintenanceScheduler = maintenanceScheduler;
  }

  async execute({ vehicleId }) {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

    const result = await this.maintenanceScheduler.checkAndSchedule(vehicle);
    await this.vehicleRepository.save(vehicle);

    return {
      vehicleId: vehicle.id,
      status: vehicle.status,
      isDue: result.isDue,
      reason: result.reason,
    };
  }
}

module.exports = { ScheduleMaintenanceUseCase };
