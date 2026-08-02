'use strict';

/**
 * @typedef {import('../../application/ports/InventoryRepositoryPort').InventoryRepositoryPort} InventoryRepositoryPort
 */

/**
 * InMemoryInventoryRepository — a driven adapter for InventoryRepositoryPort.
 * It ships as the default so the scaffold runs with zero external
 * services; swap it for a PostgresInventoryRepository (same directory,
 * same port) without touching application/ or domain/.
 *
 * @implements {InventoryRepositoryPort}
 */
class InMemoryInventoryRepository {
  constructor() {
    /** @type {Map<string, import('../../domain/inventory/entities/Product').Product>} */
    this.products = new Map();
  }

  /** @param {string} sku */
  async findBySku(sku) {
    return this.products.get(sku) ?? null;
  }

  /** @param {import('../../domain/inventory/entities/Product').Product} product */
  async save(product) {
    this.products.set(product.sku, product);
  }

  async findAll() {
    return Array.from(this.products.values());
  }
}

module.exports = { InMemoryInventoryRepository };
