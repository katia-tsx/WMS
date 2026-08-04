'use strict';

/**
 * OrderAllocationService
 * Allocates available inventory to order lines.
 * Computes allocated quantity vs backordered quantity for each order line.
 */
class OrderAllocationService {
  /**
   * Allocates available stock mapping to an order's lines
   * @param {import('../entities/Order').Order} order
   * @param {Map<string, number>} stockMap - Map of productSku -> availableQuantity
   * @returns {Object} Allocation summary { fullyAllocated, allocatedLinesCount, backorderedLinesCount }
   */
  static allocateOrder(order, stockMap) {
    let fullyAllocated = true;
    let allocatedLinesCount = 0;
    let backorderedLinesCount = 0;

    for (const line of order.lines) {
      const available = stockMap.get(line.productSku) || 0;
      const allocated = line.allocate(available);

      // Decrement used available stock from map
      stockMap.set(line.productSku, Math.max(0, available - allocated));

      if (line.status === 'ALLOCATED') {
        allocatedLinesCount++;
      } else {
        fullyAllocated = false;
        backorderedLinesCount++;
      }
    }

    if (fullyAllocated) {
      order.allocate();
    }

    return {
      fullyAllocated,
      allocatedLinesCount,
      backorderedLinesCount,
    };
  }
}

module.exports = { OrderAllocationService };
