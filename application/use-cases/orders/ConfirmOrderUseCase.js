'use strict';

const { UseCase } = require('../UseCase');
const { OrderConfirmedEvent } = require('../../../domain/orders/events/OrderConfirmedEvent');

class ConfirmOrderUseCase extends UseCase {
  constructor({ orderRepository, eventPublisher }) {
    super();
    this.orderRepository = orderRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ orderId }) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    order.confirm();
    await this.orderRepository.save(order);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new OrderConfirmedEvent(order));
    }

    return { orderId: order.id, state: order.state };
  }
}

module.exports = { ConfirmOrderUseCase };
