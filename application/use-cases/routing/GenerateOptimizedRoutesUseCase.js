'use strict';

const { UseCase } = require('../UseCase');
const { Route } = require('../../../domain/routing/entities/Route');

class GenerateOptimizedRoutesUseCase extends UseCase {
  constructor({ routeRepository, optimizationEngine }) {
    super();
    if (!optimizationEngine) throw new Error('GenerateOptimizedRoutesUseCase requires optimizationEngine (IRouteOptimizationEngine)');
    this.routeRepository = routeRepository;
    this.optimizationEngine = optimizationEngine;
  }

  async execute({ depot, stops, maxVehicleCapacity }) {
    const vrpResult = await this.optimizationEngine.optimize({
      depot,
      stops,
      maxVehicleCapacity,
    });

    const routeEntities = vrpResult.routes.map(
      (rData) =>
        new Route({
          id: rData.routeId,
          vehicleId: rData.vehicleId,
          depot,
          stops: rData.stops,
          totalDistanceKm: rData.totalDistanceKm,
          totalDurationMinutes: rData.totalDurationMinutes,
        })
    );

    if (this.routeRepository) {
      for (const route of routeEntities) {
        await this.routeRepository.save(route);
      }
    }

    return {
      routes: routeEntities,
      unassignedStops: vrpResult.unassignedStops,
      solverMetrics: vrpResult.solverMetrics,
    };
  }
}

module.exports = { GenerateOptimizedRoutesUseCase };
