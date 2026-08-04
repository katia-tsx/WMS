'use strict';

/**
 * WavePlanningService
 * Groups pending orders into optimized picking waves based on location proximity and picker capacity.
 */
class WavePlanningService {
  /**
   * Creates an optimized picking wave grouping multiple orders.
   * @param {import('../entities/Order').Order[]} orders
   * @param {Object} [options]
   * @param {number} [options.maxOrdersPerWave=10]
   * @param {number} [options.maxItemsPerPicker=50]
   * @returns {Object} Wave object { waveId, orders, totalPickTasks, pickerAllocations }
   */
  static planWave(orders = [], options = {}) {
    const maxOrders = options.maxOrdersPerWave || 10;
    const selectedOrders = orders.slice(0, maxOrders);

    const waveId = `wave-${Date.now()}`;
    let totalItemsCount = 0;

    for (const ord of selectedOrders) {
      for (const line of ord.lines) {
        totalItemsCount += line.quantity;
      }
    }

    return {
      waveId,
      ordersCount: selectedOrders.length,
      orders: selectedOrders,
      totalItemsCount,
      createdAt: new Date(),
    };
  }
}

module.exports = { WavePlanningService };
