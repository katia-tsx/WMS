'use strict';

const { IForecastingStrategy } = require('../../../ports/IForecastingStrategy');

/**
 * Exponential Smoothing Forecasting Strategy
 * Applies exponentially decreasing weights over older demand values.
 */
class ExponentialSmoothingStrategy extends IForecastingStrategy {
  constructor(alpha = 0.3) {
    super();
    this.alpha = alpha;
  }

  forecast(historicalData, forecastPeriods = 3) {
    if (!Array.isArray(historicalData) || historicalData.length === 0) {
      return Array.from({ length: forecastPeriods }, () => 0);
    }

    let smoothed = historicalData[0];
    for (let i = 1; i < historicalData.length; i++) {
      smoothed = this.alpha * historicalData[i] + (1 - this.alpha) * smoothed;
    }

    const val = Number(smoothed.toFixed(2));
    return Array.from({ length: forecastPeriods }, () => val);
  }
}

module.exports = { ExponentialSmoothingStrategy };
