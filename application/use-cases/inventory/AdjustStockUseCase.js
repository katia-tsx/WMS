'use strict';

const { UseCase } = require('../UseCase');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { NotFoundError, BusinessRuleViolationError } = require('../../../domain/shared-kernel/errors/DomainError');
const { StockDepletedEvent } = require('../../../domain/inventory/events/StockDepletedEvent');
const { InsufficientStockError } = require('../../../domain/inventory/entities/Product');

/**
 * @typedef {import('../../ports/InventoryRepositoryPort').InventoryRepositoryPort} InventoryRepositoryPort
 * @typedef {import('../../ports/EventPublisherPort').EventPublisherPort} EventPublisherPort
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
 */
class AdjustStockUseCase extends UseCase {
  /**
   * @param {Object} deps
   * @param {InventoryRepositoryPort} deps.inventoryRepository
   * @param {EventPublisherPort} deps.eventPublisher
   * @param {IValidator} [deps.validator]
   */
  constructor({ inventoryRepository, eventPublisher, validator }) {
    super({ validator });
    this.inventoryRepository = inventoryRepository;
    this.eventPublisher = eventPublisher;
  }

  /**
   * @param {Object} input
   * @param {string} input.sku
   * @param {number} input.amount
   * @returns {Promise<import('../../../domain/shared-kernel/result/Result').Result>}
   */
  async handle({ sku, amount }) {
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

    if (product.quantityOnHand === 0) {
      await this.eventPublisher.publish(new StockDepletedEvent(product.sku));
    }

    return Result.ok(product);
  }
}

module.exports = { AdjustStockUseCase };
