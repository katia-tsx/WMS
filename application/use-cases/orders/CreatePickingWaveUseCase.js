'use strict';

const { UseCase } = require('../UseCase');
const { WavePlanningService } = require('../../../domain/orders/services/WavePlanningService');

class CreatePickingWaveUseCase extends UseCase {
  constructor({ orderRepository, waveRepository }) {
    super();
    this.orderRepository = orderRepository;
    this.waveRepository = waveRepository;
  }

  async execute({ orderIds = [], maxOrders = 10 }) {
    const orders = [];
    for (const id of orderIds) {
      const ord = await this.orderRepository.findById(id);
      if (ord) orders.push(ord);
    }

    const wave = WavePlanningService.planWave(orders, { maxOrdersPerWave: maxOrders });

    if (this.waveRepository) {
      await this.waveRepository.save(wave);
    }

    return wave;
  }
}

module.exports = { CreatePickingWaveUseCase };
