'use strict';

const { UseCase } = require('../UseCase');
const { SimpleMovingAverageStrategy } = require('./strategies/SimpleMovingAverageStrategy');

class ForecastDemandUseCase extends UseCase {
  /**
   * @param {Object} deps
   * @param {import('../../ports/IForecastingStrategy').IForecastingStrategy} [deps.forecastingStrategy]
   */
  constructor({ forecastingStrategy }) {
    super();
    this.forecastingStrategy = forecastingStrategy || new SimpleMovingAverageStrategy();
  }

  async execute({ sku, historicalDemand = [120, 140, 135, 150, 160], periods = 3 }) {
    if (!sku) throw new Error('ForecastDemandUseCase requires sku');

    const forecastValues = this.forecastingStrategy.forecast(historicalDemand, periods);

    return {
      sku,
      historicalDemand,
      forecastPeriods: periods,
      forecast: forecastValues,
      strategyUsed: this.forecastingStrategy.constructor.name,
    };
  }
}

module.exports = { ForecastDemandUseCase };
