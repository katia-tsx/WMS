'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class OrderConfirmedEvent extends DomainEvent {
  constructor(order) {
    super('orders.order-confirmed', {
      orderId: order.id,
      customerId: order.customerId,
      priorityScore: order.priorityScore,
    });
  }
}

module.exports = { OrderConfirmedEvent };
