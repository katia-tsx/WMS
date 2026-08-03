'use strict';

const { ApplicationService } = require('../services/ApplicationService');
const { Result } = require('../../domain/shared-kernel/result/Result');

/**
 * OrderFulfillmentOrchestrator coordinates multiple use cases that must
 * run together to fulfill an order (reserve stock, create a shipment,
 * assign a route...). Orchestrators live in application/ because
 * sequencing use cases across bounded contexts is application logic —
 * it is not a business rule that belongs to any single domain context.
 *
 * Extends `ApplicationService` (application/services/ApplicationService.js)
 * so the whole line-by-line loop runs inside one shared `IUnitOfWork`
 * transaction: if reserving stock for line 3 of 5 fails, lines 1 and 2's
 * reservations are rolled back too, not left half-applied.
 *
 * Only AdjustStockUseCase is wired in so far. ShipmentCreationUseCase and
 * RouteAssignmentUseCase plug in the same way, via constructor injection,
 * once they exist under application/use-cases/shipments and
 * application/use-cases/routing.
 */
class OrderFulfillmentOrchestrator extends ApplicationService {
  /**
   * @param {Object} deps
   * @param {import('../use-cases/inventory/AdjustStockUseCase').AdjustStockUseCase} deps.adjustStockUseCase
   * @param {import('../ports/IUnitOfWork').IUnitOfWork} deps.unitOfWork
   */
  constructor({ adjustStockUseCase, unitOfWork }) {
    super({ unitOfWork });
    this.adjustStockUseCase = adjustStockUseCase;
  }

  /**
   * @param {Object} order
   * @param {{sku: string, quantity: number}[]} order.lines
   * @returns {Promise<import('../../domain/shared-kernel/result/Result').Result>}
   */
  async fulfill(order) {
    try {
      return await this.runInTransaction(async () => {
        for (const line of order.lines) {
          const result = await this.adjustStockUseCase.execute({ sku: line.sku, amount: line.quantity });
          if (result.isErr) {
            // Throwing here (rather than returning the Result quietly) is
            // what makes runInTransaction roll back every line already
            // processed in this loop, not just the one that failed.
            throw result.error;
          }
        }
        return Result.ok(order);
      });
    } catch (error) {
      return Result.err(error);
    }
  }
}

module.exports = { OrderFulfillmentOrchestrator };
