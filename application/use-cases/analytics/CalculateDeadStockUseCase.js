'use strict';

const { UseCase } = require('../UseCase');

class CalculateDeadStockUseCase extends UseCase {
  constructor({ inventoryRepository }) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  async execute({ thresholdDays = 90 }) {
    const allProducts = (await this.inventoryRepository.findAll?.()) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

    const deadStock = allProducts.filter((product) => {
      const lastMovement = product.lastMovementDate ? new Date(product.lastMovementDate) : new Date(0);
      return lastMovement < cutoffDate && product.quantity > 0;
    });

    const totalDeadStockValue = deadStock.reduce((sum, p) => sum + p.quantity * (p.unitPrice || 10), 0);

    return {
      thresholdDays,
      deadStockCount: deadStock.length,
      totalDeadStockValue,
      items: deadStock.map((p) => ({
        sku: p.sku,
        name: p.name,
        quantity: p.quantity,
        lastMovementDate: p.lastMovementDate,
      })),
    };
  }
}

module.exports = { CalculateDeadStockUseCase };
