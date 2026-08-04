'use strict';

const { UseCase } = require('../UseCase');
const { VehicleAvailabilityService } = require('../../../domain/fleet/services/VehicleAvailabilityService');

class CheckVehicleAvailabilityUseCase extends UseCase {
  constructor({ vehicleRepository }) {
    super();
    this.vehicleRepository = vehicleRepository;
  }

  async execute({ vehicleId, routeDemandWeight }) {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

    try {
      VehicleAvailabilityService.assertAvailable(vehicle, routeDemandWeight);
      return { isAvailable: true, vehicleId: vehicle.id };
    } catch (err) {
      return { isAvailable: false, vehicleId: vehicle.id, reason: err.message };
    }
  }
}

module.exports = { CheckVehicleAvailabilityUseCase };
