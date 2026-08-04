'use strict';

/**
 * OrderFulfillmentMetrics CQRS Read Model
 */
class OrderFulfillmentMetrics {
  constructor({ totalOrders = 0, deliveredOnTime = 0, deliveredLate = 0, cycleTimesMinutes = [] }) {
    this.totalOrders = totalOrders;
    this.deliveredOnTime = deliveredOnTime;
    this.deliveredLate = deliveredLate;
    this.cycleTimesMinutes = cycleTimesMinutes;
  }
}

module.exports = { OrderFulfillmentMetrics };
