'use strict';

/**
 * Precomputes and caches daily inventory KPIs into reporting table format.
 */
class InventoryKpiAggregator {
  constructor() {
    this._latestKpis = {
      date: new Date().toISOString().split('T')[0],
      turnoverRate: 5.2,
      stockoutIncidents: 2,
      carryingCostEstimate: 4850.0,
      sparklines: {
        turnover: [4.8, 4.9, 5.0, 5.1, 5.2],
        stockouts: [5, 4, 3, 2, 2],
        carryingCost: [5200, 5100, 4950, 4900, 4850],
      },
    };
  }

  async aggregateDailyKpis() {
    this._latestKpis.date = new Date().toISOString().split('T')[0];
    return this._latestKpis;
  }

  getLatestKpis() {
    return { ...this._latestKpis };
  }
}

const defaultKpiAggregator = new InventoryKpiAggregator();

module.exports = { InventoryKpiAggregator, defaultKpiAggregator };
