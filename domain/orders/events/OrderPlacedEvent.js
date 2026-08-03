'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

/**
 * Raised when a customer order is placed. Defined ahead of the Orders
 * bounded context having its own entities/use cases yet (domain/orders is
 * still otherwise scaffolded) — this is the event shape
 * OrderFulfillmentOrchestrator and other cross-module consumers (Routing,
 * Notifications) will react to once an OrderPlacedUseCase exists to raise
 * it from a real Order aggregate.
 */
class OrderPlacedEvent extends DomainEvent {
  /**
   * @param {string} orderId
   * @param {{ sku: string, quantity: number }[]} lines
   */
  constructor(orderId, lines) {
    super('orders.order-placed');
    this.orderId = orderId;
    this.lines = lines;
  }
}

module.exports = { OrderPlacedEvent };
