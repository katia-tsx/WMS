'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class OrderAllocatedEvent extends DomainEvent {
  constructor(order, allocationSummary) {
    super('orders.order-allocated', {
      orderId: order.id,
      fullyAllocated: allocationSummary.fullyAllocated,
      allocatedLinesCount: allocationSummary.allocatedLinesCount,
      backorderedLinesCount: allocationSummary.backorderedLinesCount,
    });
  }
}

module.exports = { OrderAllocatedEvent };
