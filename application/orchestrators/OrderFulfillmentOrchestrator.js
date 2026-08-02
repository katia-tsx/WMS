'use strict';

/**
 * OrderFulfillmentOrchestrator coordinates multiple use cases that must
 * run together to fulfill an order (reserve stock, create a shipment,
 * assign a route...). Orchestrators live in application/ because
 * sequencing use cases across bounded contexts is application logic —
 * it is not a business rule that belongs to any single domain context.
 *
 * Only AdjustStockUseCase is wired in so far. ShipmentCreationUseCase and
 * RouteAssignmentUseCase plug in the same way, via constructor injection,
 * once they exist under application/use-cases/shipments and
 * application/use-cases/routing.
 */
class OrderFulfillmentOrchestrator {
  /**
   * @param {Object} deps
   * @param {import('../use-cases/inventory/AdjustStockUseCase').AdjustStockUseCase} deps.adjustStockUseCase
   */
  constructor({ adjustStockUseCase }) {
    this.adjustStockUseCase = adjustStockUseCase;
  }

  /**
   * @param {Object} order
   * @param {{sku: string, quantity: number}[]} order.lines
   */
  async fulfill(order) {
    for (const line of order.lines) {
      await this.adjustStockUseCase.execute({ sku: line.sku, amount: line.quantity });
    }
  }
}

module.exports = { OrderFulfillmentOrchestrator };
