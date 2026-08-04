'use strict';

const { UseCase } = require('../UseCase');

class CalculateInventoryTurnoverUseCase extends UseCase {
  constructor({ inventoryRepository }) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  async execute({ cogs = 120000, avgInventoryValue = 24000 }) {
    if (avgInventoryValue <= 0) {
      return { turnoverRate: 0, daysSalesOfInventory: 0 };
    }

    const turnoverRate = Number((cogs / avgInventoryValue).toFixed(2));
    const daysSalesOfInventory = Number((365 / turnoverRate).toFixed(1));

    return {
      cogs,
      avgInventoryValue,
      turnoverRate,
      daysSalesOfInventory,
    };
  }
}

module.exports = { CalculateInventoryTurnoverUseCase };
