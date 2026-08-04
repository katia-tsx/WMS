'use strict';

const { UseCase } = require('../UseCase');
const { Order } = require('../../../domain/orders/entities/Order');
const { OrderPriorityScorer } = require('../../../domain/orders/services/OrderPriorityScorer');

class CreateOrderUseCase extends UseCase {
  constructor({ orderRepository, validationChain }) {
    super();
    this.orderRepository = orderRepository;
    this.validationChain = validationChain;
  }

  async execute({ orderId, customerId, slaTier, lines, shippingAddress }) {
    const id = orderId || `ord-${Date.now()}`;
    const order = new Order({
      id,
      customerId,
      slaTier,
      lines,
      shippingAddress,
    });

    // Score fulfillment priority
    OrderPriorityScorer.calculateScore(order);

    // Validate order against validation rule chain if provided
    if (this.validationChain) {
      const violations = await this.validationChain.validate(order);
      if (violations && violations.length > 0) {
        return { success: false, order, violations };
      }
    }

    await this.orderRepository.save(order);
    return { success: true, order, violations: [] };
  }
}

module.exports = { CreateOrderUseCase };
