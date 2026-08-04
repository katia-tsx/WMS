'use strict';

const { defaultKpiAggregator } = require('../../services/InventoryKpiAggregator');
const { ForecastDemandUseCase } = require('../../../application/use-cases/analytics/ForecastDemandUseCase');

class InventoryAnalyticsController {
  constructor({ kpiAggregator = defaultKpiAggregator, forecastDemandUseCase } = {}) {
    this.kpiAggregator = kpiAggregator;
    this.forecastDemandUseCase = forecastDemandUseCase || new ForecastDemandUseCase({});
  }

  async getKpis(req, res) {
    const kpis = await this.kpiAggregator.getLatestKpis();
    return { status: 200, data: kpis };
  }

  async getDemandForecast(req, res) {
    const sku = req.params?.sku || 'WMS-1001';
    const result = await this.forecastDemandUseCase.execute({ sku });
    return { status: 200, data: result };
  }
}

module.exports = { InventoryAnalyticsController };
