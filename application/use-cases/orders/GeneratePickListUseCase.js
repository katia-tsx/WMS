'use strict';

const { UseCase } = require('../UseCase');
const { PickTask } = require('../../../domain/orders/value-objects/PickTask');
const { SerpentineRouteStrategy } = require('./strategies/SerpentineRouteStrategy');

class GeneratePickListUseCase extends UseCase {
  constructor({ orderRepository, pickRouteStrategy }) {
    super();
    this.orderRepository = orderRepository;
    this.pickRouteStrategy = pickRouteStrategy || new SerpentineRouteStrategy();
  }

  async execute({ orderId }) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    order.startPicking();

    const rawTasks = order.lines.map((line, idx) => new PickTask({
      id: `task-${order.id}-${idx + 1}`,
      locationCode: `A1-0${idx + 1}-B`,
      sku: line.productSku,
      quantity: line.allocatedQuantity || line.quantity,
    }));

    const sortedTasks = this.pickRouteStrategy.sortRoute(rawTasks);
    await this.orderRepository.save(order);

    return {
      orderId: order.id,
      state: order.state,
      pickTasks: sortedTasks,
      strategyUsed: this.pickRouteStrategy.constructor.name,
    };
  }
}

module.exports = { GeneratePickListUseCase };
