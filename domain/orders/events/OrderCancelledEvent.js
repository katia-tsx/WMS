'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class OrderCancelledEvent extends DomainEvent {
  constructor(order, reason) {
    super('orders.order-cancelled', {
      orderId: order.id,
      reason: reason || 'User cancellation',
    });
  }
}

module.exports = { OrderCancelledEvent };
