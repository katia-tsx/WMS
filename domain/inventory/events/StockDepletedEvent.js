'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

/**
 * Raised when a Product's stock reaches zero. Domain events are plain
 * data: the domain layer only describes that something happened, it
 * never decides how the rest of the system reacts to it — that is an
 * application-layer concern, mediated by an EventPublisherPort/IEventBus.
 */
class StockDepletedEvent extends DomainEvent {
  /** @param {string} sku */
  constructor(sku) {
    super('inventory.stock-depleted');
    this.sku = sku;
  }
}

module.exports = { StockDepletedEvent };
