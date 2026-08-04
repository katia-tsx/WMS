'use strict';

const { IForecastingStrategy } = require('../../../ports/IForecastingStrategy');

/**
 * Simple Moving Average Forecasting Strategy
 * Calculates average of the last N historical periods.
 */
class SimpleMovingAverageStrategy extends IForecastingStrategy {
  constructor(windowSize = 3) {
    super();
    this.windowSize = windowSize;
  }

  forecast(historicalData, forecastPeriods = 3) {
    if (!Array.isArray(historicalData) || historicalData.length === 0) {
      return Array.from({ length: forecastPeriods }, () => 0);
    }

    const n = Math.min(this.windowSize, historicalData.length);
    const recent = historicalData.slice(-n);
    const avg = recent.reduce((sum, val) => sum + val, 0) / n;

    return Array.from({ length: forecastPeriods }, () => Number(avg.toFixed(2)));
  }
}

module.exports = { SimpleMovingAverageStrategy };
