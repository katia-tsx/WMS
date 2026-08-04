'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class OrderShippedEvent extends DomainEvent {
  constructor(order) {
    super('orders.order-shipped', {
      orderId: order.id,
      customerId: order.customerId,
      shippingAddress: order.shippingAddress,
    });
  }
}

module.exports = { OrderShippedEvent };
