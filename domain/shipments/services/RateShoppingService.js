'use strict';

/**
 * RateShoppingService
 * Compares quotes across carrier adapters and selects optimal cost/speed tradeoff based on order priority.
 */
class RateShoppingService {
  /**
   * Selects best rate option from list of carrier quotes.
   * @param {Array<{ carrierCode: string, serviceName: string, cost: number, estimatedDays: number }>} quotes
   * @param {number} [orderPriorityScore=50]
   * @returns {Object} Best carrier quote
   */
  static selectBestRate(quotes = [], orderPriorityScore = 50) {
    if (!Array.isArray(quotes) || quotes.length === 0) {
      throw new Error('RateShoppingService requires non-empty quotes array');
    }

    // High priority orders (>80) heavily weight fast delivery days. Standard orders weight low cost.
    const speedWeight = orderPriorityScore >= 80 ? 10.0 : 1.0;
    const costWeight = orderPriorityScore >= 80 ? 1.0 : 5.0;

    let bestQuote = quotes[0];
    let lowestScore = Infinity;

    for (const quote of quotes) {
      const score = quote.cost * costWeight + quote.estimatedDays * speedWeight;
      if (score < lowestScore) {
        lowestScore = score;
        bestQuote = quote;
      }
    }

    return bestQuote;
  }
}

module.exports = { RateShoppingService };
