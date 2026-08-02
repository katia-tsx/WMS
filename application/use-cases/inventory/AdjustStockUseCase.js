'use strict';

const { StockDepletedEvent } = require('../../../domain/inventory/events/StockDepletedEvent');

/**
 * @typedef {import('../../ports/InventoryRepositoryPort').InventoryRepositoryPort} InventoryRepositoryPort
 * @typedef {import('../../ports/EventPublisherPort').EventPublisherPort} EventPublisherPort
 */

/**
 * AdjustStockUseCase reserves stock for an outgoing order/shipment line.
 * It depends only on ports (abstractions), never on a concrete database
 * or message broker: infrastructure depends on this use case's port
 * contracts, not the other way around (Dependency Inversion Principle).
 */
class AdjustStockUseCase {
  /**
   * @param {Object} deps
   * @param {InventoryRepositoryPort} deps.inventoryRepository
   * @param {EventPublisherPort} deps.eventPublisher
   */
  constructor({ inventoryRepository, eventPublisher }) {
    this.inventoryRepository = inventoryRepository;
    this.eventPublisher = eventPublisher;
  }

  /**
   * @param {Object} input
   * @param {string} input.sku
   * @param {number} input.amount
   */
  async execute({ sku, amount }) {
    const product = await this.inventoryRepository.findBySku(sku);
    if (!product) {
      throw new Error(`No product found for sku "${sku}".`);
    }

    product.reserveStock(amount);
    await this.inventoryRepository.save(product);

    if (product.quantityOnHand === 0) {
      await this.eventPublisher.publish(new StockDepletedEvent(product.sku));
    }

    return product;
  }
}

module.exports = { AdjustStockUseCase };
