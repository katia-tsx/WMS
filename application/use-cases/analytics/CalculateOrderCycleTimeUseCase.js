'use strict';

const { UseCase } = require('../UseCase');

class CalculateOrderCycleTimeUseCase extends UseCase {
  constructor({ analyticsRepository }) {
    super();
    this.analyticsRepository = analyticsRepository;
  }

  async execute({ orderEvents = [] }) {
    const cycleTimes = [];

    // Group events by orderId
    const orderGroups = new Map();
    for (const evt of orderEvents) {
      const orderId = evt.payload?.orderId || evt.orderId;
      if (!orderId) continue;
      if (!orderGroups.has(orderId)) orderGroups.set(orderId, []);
      orderGroups.get(orderId).push(evt);
    }

    for (const [orderId, events] of orderGroups.entries()) {
      const created = events.find((e) => e.eventType === 'orders.order-created' || e.eventType === 'orders.order-confirmed');
      const delivered = events.find((e) => e.eventType === 'orders.order-delivered' || e.eventType === 'shipments.status-changed');

      if (created && delivered) {
        const start = new Date(created.occurredAt || created.timestamp).getTime();
        const end = new Date(delivered.occurredAt || delivered.timestamp).getTime();
        const diffMins = Math.max(1, Math.round((end - start) / (1000 * 60)));
        cycleTimes.push(diffMins);
      }
    }

    const total = cycleTimes.reduce((sum, t) => sum + t, 0);
    const avgCycleTimeMinutes = cycleTimes.length > 0 ? Number((total / cycleTimes.length).toFixed(1)) : 0;

    // Build cycle time histogram bins (<30m, 30-60m, 60-120m, >120m)
    const histogram = {
      under30m: cycleTimes.filter((t) => t < 30).length,
      b30to60m: cycleTimes.filter((t) => t >= 30 && t <= 60).length,
      b60to120m: cycleTimes.filter((t) => t > 60 && t <= 120).length,
      over120m: cycleTimes.filter((t) => t > 120).length,
    };

    return {
      totalOrdersEvaluated: cycleTimes.length,
      avgCycleTimeMinutes,
      histogram,
      cycleTimes,
    };
  }
}

module.exports = { CalculateOrderCycleTimeUseCase };
