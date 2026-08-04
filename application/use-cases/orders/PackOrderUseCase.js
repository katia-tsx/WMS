'use strict';

const { UseCase } = require('../UseCase');

class PackOrderUseCase extends UseCase {
  constructor({ orderRepository }) {
    super();
    this.orderRepository = orderRepository;
  }

  async execute({ orderId }) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    order.pack();
    await this.orderRepository.save(order);

    return { orderId: order.id, state: order.state };
  }
}

module.exports = { PackOrderUseCase };
