'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { WarehouseKpiSnapshot } = require('../../../domain/analytics/read-models/WarehouseKpiSnapshot');
const { OrderFulfillmentMetrics } = require('../../../domain/analytics/read-models/OrderFulfillmentMetrics');
const { FleetUtilizationMetrics } = require('../../../domain/analytics/read-models/FleetUtilizationMetrics');

const { CalculateOrderCycleTimeUseCase } = require('./CalculateOrderCycleTimeUseCase');
const { CalculateWarehouseThroughputUseCase } = require('./CalculateWarehouseThroughputUseCase');
const { CalculateOnTimeDeliveryRateUseCase } = require('./CalculateOnTimeDeliveryRateUseCase');

describe('CQRS Analytics Read Models', () => {
  it('instantiates reporting read models with default metrics', () => {
    const kpi = new WarehouseKpiSnapshot({ itemsPicked: 100, itemsPacked: 90 });
    assert.equal(kpi.itemsPicked, 100);

    const fulfillment = new OrderFulfillmentMetrics({ totalOrders: 50, deliveredOnTime: 48 });
    assert.equal(fulfillment.deliveredOnTime, 48);

    const fleet = new FleetUtilizationMetrics({ totalVehicles: 10, activeHours: 60, idleHours: 20 });
    assert.equal(fleet.activeHours, 60);
  });
});

describe('Analytics Calculation Use Cases', () => {
  it('CalculateOrderCycleTimeUseCase computes cycle time average and histogram from event stream', async () => {
    const useCase = new CalculateOrderCycleTimeUseCase({ analyticsRepository: {} });
    const events = [
      { orderId: 'o1', eventType: 'orders.order-created', occurredAt: '2026-08-04T08:00:00Z' },
      { orderId: 'o1', eventType: 'orders.order-delivered', occurredAt: '2026-08-04T08:25:00Z' }, // 25 mins
      { orderId: 'o2', eventType: 'orders.order-created', occurredAt: '2026-08-04T08:00:00Z' },
      { orderId: 'o2', eventType: 'orders.order-delivered', occurredAt: '2026-08-04T09:10:00Z' }, // 70 mins
    ];

    const res = await useCase.execute({ orderEvents: events });
    assert.equal(res.totalOrdersEvaluated, 2);
    assert.equal(res.avgCycleTimeMinutes, 47.5);
    assert.equal(res.histogram.under30m, 1);
    assert.equal(res.histogram.b60to120m, 1);
  });

  it('CalculateWarehouseThroughputUseCase computes throughput per operator hour', async () => {
    const useCase = new CalculateWarehouseThroughputUseCase({ analyticsRepository: {} });
    const res = await useCase.execute({
      totalUnitsPicked: 400,
      totalUnitsPacked: 400,
      activeOperatorsCount: 5,
      timeWindowHours: 8,
    });

    assert.equal(res.throughputPerOperatorHour, 20.0);
    assert.equal(res.picksPerHour, 50.0);
  });

  it('CalculateOnTimeDeliveryRateUseCase computes on-time delivery rate percentage', async () => {
    const useCase = new CalculateOnTimeDeliveryRateUseCase({ analyticsRepository: {} });
    const res = await useCase.execute({ totalDeliveries: 200, onTimeCount: 190 });

    assert.equal(res.onTimeRatePercent, 95.0);
    assert.equal(res.lateCount, 10);
  });
});
