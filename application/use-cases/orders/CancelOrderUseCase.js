'use strict';

const { UseCase } = require('../UseCase');
const { OrderCancelledEvent } = require('../../../domain/orders/events/OrderCancelledEvent');

class CancelOrderUseCase extends UseCase {
  constructor({ orderRepository, eventPublisher }) {
    super();
    this.orderRepository = orderRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ orderId, reason }) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    order.cancel();
    await this.orderRepository.save(order);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new OrderCancelledEvent(order, reason));
    }

    return { orderId: order.id, state: order.state, reason };
  }
}

module.exports = { CancelOrderUseCase };
