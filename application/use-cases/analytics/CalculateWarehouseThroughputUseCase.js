'use strict';

const { UseCase } = require('../UseCase');

class CalculateWarehouseThroughputUseCase extends UseCase {
  constructor({ analyticsRepository }) {
    super();
    this.analyticsRepository = analyticsRepository;
  }

  async execute({ totalUnitsPicked = 450, totalUnitsPacked = 420, activeOperatorsCount = 5, timeWindowHours = 8 }) {
    const totalUnits = totalUnitsPicked + totalUnitsPacked;
    const totalOperatorHours = Math.max(1, activeOperatorsCount * timeWindowHours);

    const throughputPerOperatorHour = Number((totalUnits / totalOperatorHours).toFixed(1));
    const picksPerHour = Number((totalUnitsPicked / Math.max(1, timeWindowHours)).toFixed(1));

    return {
      timeWindowHours,
      activeOperatorsCount,
      totalUnitsPicked,
      totalUnitsPacked,
      picksPerHour,
      throughputPerOperatorHour,
    };
  }
}

module.exports = { CalculateWarehouseThroughputUseCase };
