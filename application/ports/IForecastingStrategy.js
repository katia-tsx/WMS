'use strict';

/**
 * Swappable IForecastingStrategy Port Interface.
 * Allows replacing simple moving average / exponential smoothing models
 * with advanced machine learning models without altering application use case logic.
 */
class IForecastingStrategy {
  /**
   * Generates demand forecast array for specified future periods based on historical demand data.
   * @param {number[]} historicalData - Array of past demand values
   * @param {number} forecastPeriods - Number of future periods to forecast
   * @returns {number[]} Array of forecasted values
   */
  forecast(historicalData, forecastPeriods = 3) {
    throw new Error('IForecastingStrategy#forecast must be implemented by subclass');
  }
}

module.exports = { IForecastingStrategy };
