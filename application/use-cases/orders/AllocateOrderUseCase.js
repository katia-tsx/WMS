'use strict';

const { UseCase } = require('../UseCase');
const { OrderAllocationService } = require('../../../domain/orders/services/OrderAllocationService');
const { OrderAllocatedEvent } = require('../../../domain/orders/events/OrderAllocatedEvent');

class AllocateOrderUseCase extends UseCase {
  constructor({ orderRepository, inventoryRepository, eventPublisher }) {
    super();
    this.orderRepository = orderRepository;
    this.inventoryRepository = inventoryRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ orderId }) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    // Fetch available inventory stock map
    const stockMap = new Map();
    for (const line of order.lines) {
      const product = await this.inventoryRepository.findBySku(line.productSku);
      stockMap.set(line.productSku, product ? product.quantity : 0);
    }

    const summary = OrderAllocationService.allocateOrder(order, stockMap);
    await this.orderRepository.save(order);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new OrderAllocatedEvent(order, summary));
    }

    return {
      orderId: order.id,
      state: order.state,
      summary,
    };
  }
}

module.exports = { AllocateOrderUseCase };
