'use strict';

const { UseCase } = require('../UseCase');

class CalculateOnTimeDeliveryRateUseCase extends UseCase {
  constructor({ analyticsRepository }) {
    super();
    this.analyticsRepository = analyticsRepository;
  }

  async execute({ totalDeliveries = 100, onTimeCount = 94 }) {
    if (totalDeliveries <= 0) {
      return { totalDeliveries: 0, onTimeCount: 0, lateCount: 0, onTimeRatePercent: 100.0 };
    }

    const lateCount = Math.max(0, totalDeliveries - onTimeCount);
    const onTimeRatePercent = Number(((onTimeCount / totalDeliveries) * 100).toFixed(1));

    return {
      totalDeliveries,
      onTimeCount,
      lateCount,
      onTimeRatePercent,
    };
  }
}

module.exports = { CalculateOnTimeDeliveryRateUseCase };
