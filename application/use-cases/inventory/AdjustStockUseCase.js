'use strict';

const { UseCase } = require('../UseCase');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { NotFoundError, BusinessRuleViolationError } = require('../../../domain/shared-kernel/errors/DomainError');
const { InsufficientStockError } = require('../../../domain/inventory/entities/Product');

/**
 * @typedef {import('../../ports/InventoryRepositoryPort').InventoryRepositoryPort} InventoryRepositoryPort
 * @typedef {import('../../ports/IValidator').IValidator} IValidator
 */

/**
 * AdjustStockUseCase reserves stock for an outgoing order/shipment line.
 * It depends only on ports (abstractions), never on a concrete database
 * or message broker: infrastructure depends on this use case's port
 * contracts, not the other way around (Dependency Inversion Principle).
 *
 * Extends `UseCase` (see application/use-cases/UseCase.js), so callers
 * always go through `execute(input)` — validation (if a validator was
 * injected) runs first, then `handle` below. Every expected failure
 * (unknown sku, insufficient stock) comes back as `Result.err`, never a
 * thrown exception.
 *
 * Notably, this use case does *not* depend on an IEventPublisher.
 * `Product.reserveStock` records its own domain events internally (see
 * domain/shared-kernel's AggregateRoot#addDomainEvent); publishing them
 * is the responsibility of whatever wraps this use case in a transaction
 * — `TransactionalUseCaseDecorator` for a standalone call, or
 * `ApplicationService` for a multi-use-case workflow — and only after
 * that transaction's commit succeeds. See ARCHITECTURE.md §9.
 */
class AdjustStockUseCase extends UseCase {
  /**
   * @param {Object} deps
   * @param {InventoryRepositoryPort} deps.inventoryRepository
   * @param {IValidator} [deps.validator]
   */
  constructor({ inventoryRepository, validator, freezeGuard }) {
    super({ validator });
    this.inventoryRepository = inventoryRepository;
    this.freezeGuard = freezeGuard;
  }

  /**
   * @param {Object} input
   * @param {string} input.sku
   * @param {number} input.amount
   * @param {string} [input.warehouseId]
   * @returns {Promise<import('../../../domain/shared-kernel/result/Result').Result>}
   */
  async handle({ sku, amount, warehouseId }) {
    if (this.freezeGuard && warehouseId) {
      try {
        await this.freezeGuard.assertNotFrozen(warehouseId);
      } catch (err) {
        return Result.err(new BusinessRuleViolationError(err.message));
      }
    }

    const product = await this.inventoryRepository.findBySku(sku);
    if (!product) {
      return Result.err(new NotFoundError(`No product found for sku "${sku}".`));
    }

    try {
      product.reserveStock(amount);
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return Result.err(new BusinessRuleViolationError(error.message));
      }
      throw error;
    }

    await this.inventoryRepository.save(product);

    return Result.ok(product);
  }
}

module.exports = { AdjustStockUseCase };
