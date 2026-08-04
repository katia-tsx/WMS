'use strict';

const { UseCase } = require('../UseCase');

class ManuallyReorderRouteStopUseCase extends UseCase {
  constructor({ routeRepository }) {
    super();
    this.routeRepository = routeRepository;
  }

  async execute({ routeId, newOrderedStops }) {
    const route = await this.routeRepository.findById(routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);

    route.resequenceStops(newOrderedStops);
    await this.routeRepository.save(route);

    return {
      routeId: route.id,
      stops: route.stops,
      totalDistanceKm: route.totalDistanceKm,
      totalDurationMinutes: route.totalDurationMinutes,
    };
  }
}

module.exports = { ManuallyReorderRouteStopUseCase };
