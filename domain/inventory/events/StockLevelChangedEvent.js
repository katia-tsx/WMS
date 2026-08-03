'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

/**
 * Raised whenever a Product's quantityOnHand changes, in either
 * direction (receiveStock or reserveStock). More general than
 * StockDepletedEvent/LowStockThresholdBreachedEvent — those describe a
 * specific threshold being crossed; this one describes every change, for
 * consumers that just need to react to "the number moved" (e.g. a
 * dashboard, a cache invalidation, an audit log).
 */
class StockLevelChangedEvent extends DomainEvent {
  /**
   * @param {string} sku
   * @param {number} previousQuantityOnHand
   * @param {number} newQuantityOnHand
   */
  constructor(sku, previousQuantityOnHand, newQuantityOnHand) {
    super('inventory.stock-level-changed');
    this.sku = sku;
    this.previousQuantityOnHand = previousQuantityOnHand;
    this.newQuantityOnHand = newQuantityOnHand;
  }
}

module.exports = { StockLevelChangedEvent };
