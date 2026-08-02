'use strict';

/**
 * Raised when a Product's stock reaches zero. Domain events are plain
 * data: the domain layer only describes that something happened, it
 * never decides how the rest of the system reacts to it — that is an
 * application-layer concern, mediated by an EventPublisherPort.
 */
class StockDepletedEvent {
  /**
   * @param {string} sku
   * @param {Date} [occurredAt]
   */
  constructor(sku, occurredAt = new Date()) {
    this.type = 'inventory.stock-depleted';
    this.sku = sku;
    this.occurredAt = occurredAt;
  }
}

module.exports = { StockDepletedEvent };
