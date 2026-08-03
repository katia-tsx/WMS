'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

/**
 * Raised the moment a reservation causes a Product to cross from at-or-above
 * its reorder threshold to at-or-below it (see
 * Product#reserveStock — fired only on that transition, not on every
 * subsequent reservation while already below threshold, so consumers
 * like a reordering workflow aren't spammed once the condition is
 * already known).
 */
class LowStockThresholdBreachedEvent extends DomainEvent {
  /**
   * @param {string} sku
   * @param {number} quantityOnHand
   * @param {number} reorderThreshold
   */
  constructor(sku, quantityOnHand, reorderThreshold) {
    super('inventory.low-stock-threshold-breached');
    this.sku = sku;
    this.quantityOnHand = quantityOnHand;
    this.reorderThreshold = reorderThreshold;
  }
}

module.exports = { LowStockThresholdBreachedEvent };
