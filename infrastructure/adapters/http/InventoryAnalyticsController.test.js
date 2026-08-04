'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { InventoryKpiAggregator } = require('../../services/InventoryKpiAggregator');
const { InventoryAnalyticsController } = require('./InventoryAnalyticsController');

describe('InventoryAnalyticsController', () => {
  it('returns KPIs and forecast responses', async () => {
    const aggregator = new InventoryKpiAggregator();
    const controller = new InventoryAnalyticsController({ kpiAggregator: aggregator });

    const kpiRes = await controller.getKpis();
    assert.equal(kpiRes.status, 200);
    assert.equal(kpiRes.data.turnoverRate, 5.2);

    const fcRes = await controller.getDemandForecast({ params: { sku: 'WMS-1001' } });
    assert.equal(fcRes.status, 200);
    assert.equal(fcRes.data.sku, 'WMS-1001');
  });
});
