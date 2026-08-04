'use strict';

const { UseCase } = require('../UseCase');

class CalculateRouteEfficiencyUseCase extends UseCase {
  constructor({ routeRepository }) {
    super();
    this.routeRepository = routeRepository;
  }

  async execute({ routeId, actualDistanceKm, actualDurationMinutes }) {
    const route = await this.routeRepository.findById(routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);

    const plannedDist = route.totalDistanceKm || 1.0;
    const plannedDur = route.totalDurationMinutes || 1.0;

    const distanceVarianceKm = Number((actualDistanceKm - plannedDist).toFixed(2));
    const durationVarianceMinutes = actualDurationMinutes - plannedDur;

    // Efficiency Score % = (Planned Metric / Actual Metric) * 100
    const distRatio = Math.min(1.0, plannedDist / Math.max(1, actualDistanceKm));
    const durRatio = Math.min(1.0, plannedDur / Math.max(1, actualDurationMinutes));
    const efficiencyScore = Number((((distRatio + durRatio) / 2) * 100).toFixed(1));

    return {
      routeId: route.id,
      plannedDistanceKm: plannedDist,
      actualDistanceKm,
      distanceVarianceKm,
      plannedDurationMinutes: plannedDur,
      actualDurationMinutes,
      durationVarianceMinutes,
      efficiencyScorePercent: efficiencyScore,
    };
  }
}

module.exports = { CalculateRouteEfficiencyUseCase };
