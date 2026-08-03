'use strict';

const { Product } = require('../../domain/inventory/entities/Product');

/**
 * @typedef {import('../../application/ports/InventoryRepositoryPort').InventoryRepositoryPort} InventoryRepositoryPort
 */

/**
 * @param {Product} product
 * @returns {Product}
 */
function copyOf(product) {
  return new Product({
    sku: product.sku,
    name: product.name,
    quantityOnHand: product.quantityOnHand,
    reorderThreshold: product.reorderThreshold,
  });
}

/**
 * InMemoryInventoryRepository — a driven adapter for InventoryRepositoryPort.
 * It ships as the default so the scaffold runs with zero external
 * services; swap it for a PostgresInventoryRepository (same directory,
 * same port) without touching application/ or domain/.
 *
 * Reads hand out a *copy* of the stored Product, not the live instance
 * sitting in `this.products` — a caller mutating what it read (e.g.
 * AdjustStockUseCase calling `product.reserveStock(amount)`) only ever
 * touches its own copy until it explicitly calls `save()`. This is what
 * makes InMemoryUnitOfWork's Map-snapshot rollback (see
 * infrastructure/di/CompositionRoot.js) actually correct: a snapshot
 * taken at `begin()` can't be silently mutated by writes the transaction
 * hasn't committed yet.
 *
 * @implements {InventoryRepositoryPort}
 */
class InMemoryInventoryRepository {
  constructor() {
    /** @type {Map<string, Product>} */
    this.products = new Map();
  }

  /** @param {string} sku */
  async findBySku(sku) {
    const product = this.products.get(sku);
    return product ? copyOf(product) : null;
  }

  /** @param {Product} product */
  async save(product) {
    this.products.set(product.sku, product);
  }

  async findAll() {
    return Array.from(this.products.values()).map(copyOf);
  }
}

module.exports = { InMemoryInventoryRepository };
