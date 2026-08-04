'use strict';

const { UseCase } = require('../UseCase');

class AssignVehicleToRouteUseCase extends UseCase {
  constructor({ routeRepository }) {
    super();
    this.routeRepository = routeRepository;
  }

  async execute({ routeId, vehicleId, driverId }) {
    const route = await this.routeRepository.findById(routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);

    route.assignVehicleAndDriver(vehicleId, driverId);
    await this.routeRepository.save(route);

    return {
      routeId: route.id,
      vehicleId: route.vehicleId,
      driverId: route.driverId,
    };
  }
}

module.exports = { AssignVehicleToRouteUseCase };
